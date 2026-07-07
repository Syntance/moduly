import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import { refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows";
import {
  EXPRESS_FEE_SHIPPING_METHOD_NAME,
  planExpressFeeReconcile,
} from "../../../../lib/express-fee";
import { STORE_CART_REMOTE_QUERY_FIELDS } from "../../../../lib/store-cart-fields";
import { captureMessage } from "../../../../lib/sentry";

/**
 * POST /store/custom/cart-express
 *
 * Ustawia metadata.express_delivery oraz express_fee_minor (50% subtotal w groszach, 0 gdy wyłączone)
 * przez Cart Module — bez updateCartWorkflow (workflow potrafi zwracać 500 przy lock / refresh line items).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { cart_id?: string; express_delivery?: boolean };
  const cartId = body.cart_id?.trim();
  if (!cartId) {
    return res.status(400).json({ message: "cart_id jest wymagane" });
  }
  if (typeof body.express_delivery !== "boolean") {
    return res.status(400).json({ message: "express_delivery (boolean) jest wymagane" });
  }

  const cartModule = req.scope.resolve(Modules.CART);
  const existingList = await cartModule.listCarts(
    { id: [cartId] },
    { select: ["id", "metadata", "completed_at"], take: 1 },
  );
  const existing = existingList[0];
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart ${cartId} not found`);
  }
  if (existing.completed_at) {
    return res.status(400).json({ message: "Koszyk jest już zakończony" });
  }

  /**
   * KRYTYCZNE ×2:
   * 1. Pola muszą zawierać `items.total` — storefront po tej odpowiedzi
   *    przelicza „Produkty" z sum pozycji (rabaty!).
   * 2. Snapshot MUSI iść przez `query.graph` z filtrem, NIE przez
   *    `remoteQueryObjectFromString(variables.filters)`: przy polach z
   *    linkiem cross-module (`promotions.*`) tamten wariant GUBIŁ filtr
   *    i zwracał PIERWSZY koszyk z bazy — cudzy koszyk trafiał do UI
   *    klienta (incydent 06.07.2026: „pusty koszyk po kliknięciu express"
   *    + wyciek cudzych danych). Dodatkowo twardy assert id poniżej.
   */
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const readCartSnapshot = async () => {
    const { data } = await query.graph({
      entity: "cart",
      // + payment_collection.id: po rekoncyliacji metody-dopłaty musimy
      // wiedzieć, czy odświeżyć kwotę kolekcji (koszyk w trakcie checkoutu).
      fields: [...STORE_CART_REMOTE_QUERY_FIELDS, "payment_collection.id"],
      filters: { id: cartId },
    });
    const snapshot = (data as Array<{ id?: string }>)[0];
    if (!snapshot) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart ${cartId} not found`);
    }
    // Defense-in-depth: NIGDY nie zwracamy koszyka innego niż żądany.
    if (snapshot.id !== cartId) {
      captureMessage("[cart-express] snapshot zwrócił inny koszyk niż żądany", "error", {
        requested_cart_id: cartId,
        returned_cart_id: snapshot.id ?? "?",
      });
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Nie udało się odczytać koszyka — spróbuj ponownie.",
      );
    }
    return snapshot;
  };

  const cartSnapshot = await readCartSnapshot();

  function amountToNumber(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    if (v && typeof v === "object") {
      // query.graph zwraca kwoty jako BigNumber (getter `numeric`); do JSON
      // serializują się jako liczby, ale w pamięci to obiekty — bez tej
      // gałęzi suma pozycji wychodziła 0 i fee zapisywało się jako "0".
      if ("numeric" in v) {
        return amountToNumber((v as { numeric: unknown }).numeric);
      }
      if ("value" in v) {
        return amountToNumber((v as { value: unknown }).value);
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }
  // Baza dopłaty = suma `items.total` (PO rabatach) — parytet z CartProvider
  // (productsSubtotal) i prepare-checkout (itemSubtotal). `cart.subtotal`
  // jest PRZED rabatem, więc przy aktywnym kodzie promocyjnym metadata
  // pokazywałaby inną kwotę niż faktycznie pobierana.
  const snapshotItems = ((
    cartSnapshot as {
      items?: Array<{
        total?: unknown;
        subtotal?: unknown;
        unit_price?: unknown;
        quantity?: unknown;
      }> | null;
    }
  ).items ?? []);
  // Fallback total → subtotal → unit_price×qty: dekoracja kwot pozycji
  // potrafi zniknąć (jak w prepare-checkout, bug 06.07.2026 wieczór).
  const itemsTotalNum = snapshotItems.reduce((sum, item) => {
    const total = amountToNumber(item?.total);
    if (total > 0) return sum + total;
    const subtotal = amountToNumber(item?.subtotal);
    if (subtotal > 0) return sum + subtotal;
    const unit = amountToNumber(item?.unit_price);
    const qty = amountToNumber(item?.quantity);
    return unit > 0 && qty > 0 ? sum + unit * qty : sum;
  }, 0);
  // Medusa v2 — kwoty dziesiętne w PLN. 50% sumy pozycji zaokrąglamy do groszy
  // (nie do pełnych złotych, jak było w konwencji grosze/integer).
  const expressFee = body.express_delivery
    ? Math.round(itemsTotalNum * 0.5 * 100) / 100
    : 0;

  const prev =
    existing.metadata && typeof existing.metadata === "object"
      ? { ...existing.metadata }
      : {};
  const metadata = {
    ...prev,
    express_delivery: body.express_delivery ? "true" : "false",
    // Nazwa pola zachowana dla kompatybilności wstecznej — wartość to teraz
    // PLN decimal, nie grosze.
    express_fee_minor: String(expressFee),
  };

  await cartModule.updateCarts([{ id: cartId, metadata }]);

  /**
   * Rekoncyliacja metody-dopłaty OD RAZU (bug 06.07.2026 wieczór): dopłata
   * express jest realną metodą wysyłki, a ten endpoint zmieniał tylko
   * metadata — po ODZNACZENIU expressu metoda 2,50 zł zostawała na koszyku
   * aż do następnego prepare-checkout i „Do zapłaty" dalej ją zawierało
   * (fee doliczane niezależnie od checkboxa). Plan jest idempotentny:
   * włączenie dodaje/koryguje metodę, wyłączenie ją usuwa.
   */
  const snapshotMethods = (
    (cartSnapshot as {
      shipping_methods?: Array<{
        id?: string | null;
        name?: string | null;
        amount?: unknown;
      }> | null;
    }).shipping_methods ?? []
  ).map((m) => ({
    id: m.id,
    name: m.name,
    // BigNumber z query.graph → liczba (planExpressFeeReconcile porównuje kwoty).
    amount: amountToNumber(m.amount),
  }));
  const feePlan = planExpressFeeReconcile({
    expressDelivery: body.express_delivery,
    itemSubtotal: itemsTotalNum,
    methods: snapshotMethods,
  });
  if (feePlan.changed) {
    if (feePlan.deleteIds.length > 0) {
      await cartModule.deleteShippingMethods(feePlan.deleteIds);
    }
    if (feePlan.addAmount !== null) {
      await cartModule.addShippingMethods([
        {
          cart_id: cartId,
          name: EXPRESS_FEE_SHIPPING_METHOD_NAME,
          amount: feePlan.addAmount,
        },
      ]);
    }
    // Koszyk w trakcie checkoutu (kolekcja płatności istnieje) — odśwież jej
    // kwotę, żeby sesja P24 przy submit dostała aktualny total.
    const collectionId = (
      cartSnapshot as { payment_collection?: { id?: string } | null }
    ).payment_collection?.id;
    if (collectionId) {
      await refreshPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id: cartId },
      });
    }
  }

  const cart = await readCartSnapshot();

  return res.status(200).json({ cart });
}
