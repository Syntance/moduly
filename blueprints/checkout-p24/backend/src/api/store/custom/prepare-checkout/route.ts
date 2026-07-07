import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import {
  addShippingMethodToCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { persistCartCheckoutMetadata } from "../../../../lib/cart-checkout-metadata";
import {
  EXPRESS_FEE_SHIPPING_METHOD_NAME,
  planExpressFeeReconcile,
  type ShippingMethodRow,
} from "../../../../lib/express-fee";
import { PRZELEWY24_PROVIDER_ID } from "../../../../lib/p24-reconcile";
import {
  planP24SessionForCheckout,
  p24SessionIdFromData,
} from "../../../../lib/p24-session-reuse";
import {
  fetchP24TransactionBySessionId,
  loadP24ApiConfig,
  P24_STATUS_PAID,
  P24_STATUS_VERIFY,
} from "../../../../lib/p24-transaction-api";
import { captureMessage } from "../../../../lib/sentry";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });
}

type Body = {
  cart_id?: string;
  option_id?: string;
  provider_id?: string;
  order_notes?: string;
  company_name?: string;
  nip?: string;
  consent_analytics?: boolean;
  consent_marketing?: boolean;
  ph_distinct_id?: string;
  ph_session_id?: string;
  traffic_source?: string;
};

/**
 * POST /store/custom/prepare-checkout
 *
 * Łączy 3 kroki checkoutu w jeden HTTP round-trip:
 *   1. dodanie metody dostawy (shipping method),
 *   2. utworzenie `payment_collection` dla koszyka (jeśli nie istnieje),
 *   3. utworzenie `payment_session` u wybranego providera (jeśli nie istnieje).
 *
 * Bez tego storefront robił 2 sekwencyjne requesty (addShippingMethod →
 * initiatePaymentSession), każdy ~600 ms network + workflow. Teraz jeden
 * request ~800 ms (workflows idą wewnętrznie, bez latencji HTTP między nimi).
 *
 * Endpoint jest idempotentny:
 *   - jeśli ta sama opcja dostawy jest już przypięta, Medusa w zasadzie
 *     nadpisuje ją (workflow sam obsługuje deduplikację per shipping_option),
 *   - payment_collection tworzone tylko jak nie istnieje,
 *   - payment_session tworzone tylko jak nie ma sesji dla podanego providera.
 *
 * WAŻNE: Przekazuje cart.email i cart_id do payment providera przez pole `data`
 * workflow. Przelewy24 wymaga poprawnego emaila już przy rejestracji transakcji.
 *
 * Zwraca świeży cart + identyfikatory, żeby storefront nie musiał robić
 * dodatkowego `cart.retrieve`.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  if (ratelimit) {
    const xForwardedFor = req.headers["x-forwarded-for"];
    const identifier = (typeof xForwardedFor === "string" ? xForwardedFor : xForwardedFor?.[0]) ?? "anonymous";
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

    if (!success) {
      return res.status(429).json({
        error: "Za dużo prób. Spróbuj ponownie za chwilę.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      });
    }

    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", reset.toString());
  }

  const body = (req.body ?? {}) as Body;
  const cartId = body.cart_id?.trim();
  const optionId = body.option_id?.trim();
  const providerId = body.provider_id?.trim();
  const orderNotes = body.order_notes?.trim() ?? "";

  if (!cartId || !optionId || !providerId) {
    return res.status(400).json({
      message: "cart_id, option_id oraz provider_id są wymagane",
    });
  }

  const scope = req.scope;

  try {
    await addShippingMethodToCartWorkflow(scope).run({
      input: {
        cart_id: cartId,
        options: [{ id: optionId }],
      },
    });

    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const cartFields = [
      "id",
      "email",
      "completed_at",
      "metadata",
      "items.id",
      "items.total",
      "items.subtotal",
      "items.unit_price",
      "items.quantity",
      "shipping_methods.id",
      "shipping_methods.name",
      "shipping_methods.amount",
      "payment_collection.id",
      "payment_collection.amount",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.amount",
      "payment_collection.payment_sessions.data",
    ];
    const pcObject = remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { filters: { id: cartId } },
      fields: cartFields,
    });
    const [cartSnapshot] = await remoteQuery(pcObject);
    if (!cartSnapshot) {
      return res.status(404).json({ message: `Cart ${cartId} not found` });
    }
    // Defense-in-depth (incydent cart-express 06.07.2026): remoteQuery z
    // pewnymi kombinacjami pól potrafi zgubić filtr i zwrócić PIERWSZY koszyk
    // z bazy. Nigdy nie operujemy na koszyku innym niż żądany.
    if ((cartSnapshot as { id?: string }).id !== cartId) {
      return res.status(500).json({
        message: "Nie udało się odczytać koszyka — spróbuj ponownie.",
      });
    }

    const snapshot = cartSnapshot as {
      completed_at?: string | null;
      metadata?: Record<string, unknown> | null;
      items?: Array<{
        id?: string;
        total?: number | string | null;
        subtotal?: number | string | null;
        unit_price?: number | string | null;
        quantity?: number | string | null;
      }> | null;
      shipping_methods?: ShippingMethodRow[] | null;
    };
    if (snapshot.completed_at) {
      return res.status(400).json({
        message: "Koszyk został już sfinalizowany — nie można ponownie opłacić.",
        type: "cart_completed",
      });
    }
    if (!snapshot.items?.length) {
      return res.status(400).json({
        message: "Koszyk jest pusty — dodaj produkty przed płatnością.",
        type: "cart_empty",
      });
    }

    const cartEmail = (cartSnapshot as { email?: string }).email ?? "";

    /**
     * DOPŁATA EKSPRESOWA jako metoda wysyłki (audyt 06.07.2026): kwota
     * pokazana klientowi MUSI równać się kwocie pobranej przez P24, a P24
     * bierze wyłącznie zweryfikowany total koszyka. Rekoncyliacja jest
     * idempotentna i wykonywana PO addShippingMethodToCartWorkflow, bo ten
     * workflow usuwa wszystkie metody koszyka przy każdym wyborze kuriera.
     */
    const expressDelivery =
      String(snapshot.metadata?.express_delivery ?? "") === "true";
    /**
     * BUG 06.07.2026 (wieczór): remoteQuery na części koszyków NIE dekoruje
     * `items.total`/`items.subtotal` (pole znika z odpowiedzi — np. koszyk
     * bez adresu = brak kontekstu podatkowego). itemSubtotal wychodził 0,
     * fee = 0 i dopłata express ZNIKAŁA z płatności (P24 rejestrował total
     * bez +50%). Fallback: total → subtotal → unit_price × quantity.
     */
    const itemSubtotal = (snapshot.items ?? []).reduce((sum, item) => {
      const total = Number(item.total);
      if (Number.isFinite(total) && total > 0) return sum + total;
      const subtotal = Number(item.subtotal);
      if (Number.isFinite(subtotal) && subtotal > 0) return sum + subtotal;
      const unit = Number(item.unit_price);
      const qty = Number(item.quantity);
      if (Number.isFinite(unit) && Number.isFinite(qty) && unit > 0 && qty > 0) {
        return sum + unit * qty;
      }
      return sum;
    }, 0);
    if (expressDelivery && itemSubtotal <= 0 && (snapshot.items?.length ?? 0) > 0) {
      // Express zamówiony, pozycje istnieją, a baza dopłaty wyszła 0 —
      // dekoracja kwot znowu nawala. Alarm zamiast cichej straty przychodu.
      captureMessage(
        "[prepare-checkout] express aktywny, ale itemSubtotal=0 — dopłata pominięta",
        "error",
        { cart_id: cartId, items_count: String(snapshot.items?.length ?? 0) },
      );
    }
    const feePlan = planExpressFeeReconcile({
      expressDelivery,
      itemSubtotal,
      methods: snapshot.shipping_methods ?? [],
    });

    /**
     * Zanim zmienimy total koszyka (dopłata express), sprawdź czy na WISZĄCĄ
     * sesję P24 nie idą już pieniądze — zmiana totalu skasuje sesję
     * (refreshPaymentCollection), a wpłata zostałaby osierocona. Wtedy 409:
     * webhook/cron domkną zamówienie na starą kwotę.
     */
    if (feePlan.changed) {
      const originalSessions =
        (cartSnapshot as {
          payment_collection?: {
            payment_sessions?: Array<{
              provider_id?: string;
              status?: string;
              data?: Record<string, unknown> | null;
            }>;
          };
        }).payment_collection?.payment_sessions ?? [];
      const pendingP24 = originalSessions.find(
        (s) =>
          s.provider_id === PRZELEWY24_PROVIDER_ID &&
          (s.status ?? "pending") === "pending",
      );
      const p24Config = loadP24ApiConfig();
      const inflightSessionId = p24SessionIdFromData(pendingP24?.data);
      if (p24Config && inflightSessionId) {
        const tx = await fetchP24TransactionBySessionId(inflightSessionId, p24Config);
        if (
          tx &&
          (tx.status === P24_STATUS_VERIFY || tx.status === P24_STATUS_PAID)
        ) {
          return res.status(409).json({
            message:
              "Twoja wcześniejsza wpłata już do nas dotarła i jest przetwarzana — zamówienie potwierdzimy automatycznie e-mailem. Nie płać ponownie.",
            type: "payment_in_progress",
          });
        }
      }
    }

    if (feePlan.changed) {
      const cartModule = scope.resolve(Modules.CART);
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
      // Utrwal wyliczoną dopłatę w metadata — magazyn/e-maile pokazują
      // dokładnie tę kwotę zamiast liczyć 50% po swojemu.
      await cartModule.updateCarts([
        {
          id: cartId,
          metadata: {
            ...(snapshot.metadata ?? {}),
            express_fee_minor:
              feePlan.addAmount !== null ? String(feePlan.addAmount) : "0",
          },
        },
      ]);
    }

    let paymentCollectionId = (cartSnapshot as {
      payment_collection?: { id?: string };
    }).payment_collection?.id;

    if (!paymentCollectionId) {
      const { result } = await createPaymentCollectionForCartWorkflow(scope).run({
        input: { cart_id: cartId },
      });
      paymentCollectionId = (result as { id: string }).id;
    } else if (feePlan.changed) {
      // Zmiana metod wysyłki poszła module-level (bez workflow), więc kwota
      // payment_collection nie odświeżyła się sama.
      await refreshPaymentCollectionForCartWorkflow(scope).run({
        input: { cart_id: cartId },
      });
    }

    // Świeży odczyt kolekcji i sesji — po rekoncyliacji dopłaty kwoty mogły się zmienić.
    const [freshSnapshot] = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "cart",
        variables: { filters: { id: cartId } },
        fields: [
          "id",
          "payment_collection.id",
          "payment_collection.amount",
          "payment_collection.payment_sessions.id",
          "payment_collection.payment_sessions.provider_id",
          "payment_collection.payment_sessions.status",
          "payment_collection.payment_sessions.amount",
          "payment_collection.payment_sessions.data",
        ],
      }),
    );
    const freshCollection = (freshSnapshot as {
      payment_collection?: {
        id?: string;
        amount?: number | string | null;
        payment_sessions?: Array<{
          id: string;
          provider_id?: string;
          status?: string;
          amount?: number | string | null;
          data?: Record<string, unknown> | null;
        }>;
      };
    } | undefined)?.payment_collection;
    paymentCollectionId = freshCollection?.id ?? paymentCollectionId;

    const sessions = freshCollection?.payment_sessions ?? [];
    const providerSession =
      sessions.find((s) => s.provider_id === providerId) ?? null;

    /**
     * GUARD KWOTY SESJI (server-side odpowiednik guardu storefrontu):
     * sesja P24 pending na inną kwotę niż aktualny total → przerejestruj,
     * ALE najpierw sprawdź w P24, czy na starą transakcję nie weszły już
     * środki — skasowanie takiej sesji osieroca wpłatę (klasa podwójnej
     * wpłaty z 06.07.2026).
     */
    const sessionPlan = planP24SessionForCheckout({
      session: providerSession,
      collectionAmount: freshCollection?.amount ?? null,
    });

    if (
      sessionPlan === "recreate" &&
      providerId === PRZELEWY24_PROVIDER_ID
    ) {
      const p24Config = loadP24ApiConfig();
      const oldP24SessionId = p24SessionIdFromData(providerSession?.data);
      if (p24Config && oldP24SessionId) {
        const tx = await fetchP24TransactionBySessionId(oldP24SessionId, p24Config);
        if (
          tx &&
          (tx.status === P24_STATUS_VERIFY || tx.status === P24_STATUS_PAID)
        ) {
          return res.status(409).json({
            message:
              "Twoja wcześniejsza wpłata już do nas dotarła i jest przetwarzana — zamówienie potwierdzimy automatycznie e-mailem. Nie płać ponownie.",
            type: "payment_in_progress",
          });
        }
      }
    }

    // Koszyk darmowy (100% rabat) — Medusa pomija płatność przy completeCart
    // (validateCartPaymentsStep: canSkipPayment), a rejestracja transakcji
    // na 0 groszy w P24 i tak zostałaby odrzucona. Nie tworzymy sesji.
    const collectionAmount = Number(freshCollection?.amount ?? 0);
    const paymentRequired = Number.isFinite(collectionAmount)
      ? collectionAmount > 0
      : true;

    if (paymentRequired && (sessionPlan === "create" || sessionPlan === "recreate")) {
      // createPaymentSessionsWorkflow kasuje istniejące sesje kolekcji i
      // tworzy nową na AKTUALNĄ kwotę payment_collection (rejestracja P24
      // ze świeżym totalem).
      await createPaymentSessionsWorkflow(scope).run({
        input: {
          payment_collection_id: paymentCollectionId!,
          provider_id: providerId,
          data: {
            cart_id: cartId,
            email: cartEmail,
          },
        },
      });
    }

    // Na końcu — po workflowach, żeby metadata nie została nadpisana.
    // Snapshot zgód + PostHog ids trafia do cart.metadata, a completeCart
    // skopiuje je do order.metadata (subscriber bramkuje server-side eventy).
    // Traffic source (UTM/direct) także zostaje w metadata dla magazynu.
    await persistCartCheckoutMetadata(scope, cartId, {
      orderNotes,
      companyName: body.company_name,
      nip: body.nip,
      paymentProviderId: providerId,
      consent: {
        ...(typeof body.consent_analytics === "boolean"
          ? { analytics: body.consent_analytics }
          : {}),
        ...(typeof body.consent_marketing === "boolean"
          ? { marketing: body.consent_marketing }
          : {}),
        ...(body.ph_distinct_id ? { phDistinctId: body.ph_distinct_id } : {}),
        ...(body.ph_session_id ? { phSessionId: body.ph_session_id } : {}),
      },
      ...(body.traffic_source ? { trafficSource: body.traffic_source } : {}),
    });

    /**
     * Nie zwracamy tu pełnego snapshotu koszyka — storefront i tak robi
     * `getCart(cartId)` przez oficjalne `/store/carts/:id`, a drugi
     * remoteQuery z `defaultStoreCartFields` wywalał się na „Entity 'Cart'
     * does not have property 'region'” w naszym buildzie Medusy (join
     * `region.*` nie jest tu rozpoznawany). Zwrot jest teraz lekki i szybki.
     */
    return res.status(200).json({
      ok: true,
      payment_collection_id: paymentCollectionId,
    });
  } catch (e) {
    const err = e as { message?: string; type?: string; status?: number };
    console.error("[prepare-checkout] error", err);
    const status = err.status ?? 500;
    return res.status(status).json({
      message: err.message ?? "prepare-checkout failed",
      type: err.type,
    });
  }
}
