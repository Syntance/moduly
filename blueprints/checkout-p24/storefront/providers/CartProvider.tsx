"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as cartApi from "@/lib/medusa/cart";
import { bootstrapCartSession } from "@/lib/medusa/cart-bootstrap";
import { isAbortedFetchError, isTransientMedusaError } from "@/lib/medusa/transient-error";
import { cartLineConfigFingerprint } from "@/lib/cart/line-config-fingerprint";
import {
  clearCheckoutCompleted,
  invalidateShippingOptionsCache,
  normalizeShippingOptionsForDisplay,
  pickLowestPaidShippingOptionPrice,
  prefetchShippingOptions,
} from "@/lib/medusa/checkout";
import { resolveCartLineItemThumbnail } from "@/lib/medusa/product-thumbnail";
import {
  EXPRESS_FEE_SHIPPING_METHOD_NAME,
  expressFeeIncludedInCart,
} from "@/lib/checkout/express-fee";
import {
  hasFreeShippingPromotion,
  resolveEffectiveShippingCost,
} from "@/lib/promotions/free-shipping";

interface CartItem {
  id: string;
  variant_id: string;
  title: string;
  thumbnail?: string;
  quantity: number;
  unit_price: number;
  total: number;
  /** Kwota pozycji PRZED rabatami (items.subtotal z Medusy). */
  subtotal: number;
  metadata?: Record<string, string>;
  /**
   * Oznaczenie optymistycznie dodanej pozycji — widoczne w UI natychmiast po
   * kliknięciu „Dodaj do koszyka", zanim backend potwierdzi. Po sukcesie
   * podmieniamy ją na realny item z Medusy (po variant_id).
   */
  optimistic?: boolean;
}

interface CartState {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  shipping_total: number;
  /**
   * true gdy w koszyku jest już wybrana metoda dostawy (kurier lub odbiór).
   * Wymagane przy odbiorze osobistym: `shipping_total === 0`, ale nie doliczamy
   * szacunku kuriera do `grandTotal`.
   */
  hasShippingMethodSelection: boolean;
  /** ID opcji dostawy przypiętej w koszyku Medusy (po apply promo / prepare-checkout). */
  shippingOptionId: string | null;
  tax_total: number;
  discount_total: number;
  total: number;
  itemCount: number;
  /** Metadata koszyka (Medusa), m.in. express_delivery */
  metadata: Record<string, string>;
  /** Kody promocyjne zastosowane w koszyku (bez kodów cienia dostawy w UI). */
  appliedPromoCodes: string[];
  /**
   * Dopłata express już WLICZONA w `total` przez backend (metoda wysyłki
   * „Dopłata ekspresowa" dodawana w prepare-checkout). Gdy > 0, nie doliczamy
   * client-side surcharge — inaczej pokazalibyśmy ją podwójnie.
   */
  expressFeeInTotal: number;
  /**
   * Suma SUROWYCH kwot metod dostawy (bez metody-dopłaty express) — cena
   * kuriera PRZED rabatami. `shipping_total` jest PO adjustmentach promocji,
   * więc przy darmowej dostawie wynosi 0 i nie nadaje się do wiersza
   * „Dostawa" w konwencji „wiersze przed rabatem + jedna Zniżka".
   */
  courierShippingGross: number;
}

interface CartContextType extends CartState {
  isLoading: boolean;
  /** true po pierwszym bootstrapie koszyka — dopóki false, nie wiemy czy koszyk jest pusty. */
  isInitialized: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    variantId: string,
    quantity?: number,
    metadata?: Record<string, string>,
    openDrawer?: boolean,
    /**
     * Dane do optymistycznego wyrenderowania pozycji w drawerze, zanim
     * backend odpowie. Jeśli przekazane — UI pokaże item natychmiast, bez
     * spinnera. Bez tego fallbackujemy do starego zachowania (await backend).
     */
    preview?: { title: string; thumbnail?: string; unit_price: number },
  ) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: (code: string) => Promise<void>;
  /** Suma zniżek z Medusy (PLN, dziesiętne). */
  discountTotal: number;
  appliedPromoCodes: string[];
  /** true, gdy w metadata jest express_delivery = true / "true" */
  expressDelivery: boolean;
  setExpressDelivery: (enabled: boolean) => Promise<void>;
  /**
   * Dopłata express: 50% sumy produktów (subtotal). Medusa v2 — kwota
   * w walucie głównej (PLN, dziesiętne).
   */
  expressSurcharge: number;
  /**
   * Suma `item.total` — do wiersza „Produkty” i express; pewniejsza niż
   * `cart.subtotal` z API (czasem zawiera dostawę po wyborze metody).
   */
  productsSubtotal: number;
  /**
   * Suma `item.subtotal` (PRZED rabatami pozycji) — wiersz „Produkty" w
   * konwencji „ceny przed rabatem + jedna Zniżka na dole". Bez tego rabat
   * produktowy byłby widocznie odjęty dwa razy (w wierszu i w Zniżce).
   */
  productsPreDiscount: number;
  /**
   * Część zniżki przypadająca na DOSTAWĘ (adjustmenty promocji na metodach
   * kuriera) — UI pokazuje ją jako „Dostawa: gratis" z przekreśloną ceną,
   * a wiersz „Zniżka" tylko dla pozostałej (produktowej) części rabatu.
   */
  shippingDiscount: number;
  /** total z Medusy + expressSurcharge (gdy express włączony) + szacunek dostawy, jeśli brak shipping_total */
  grandTotal: number;
  /**
   * Gdy `shipping_total` z Medusy jest 0 — najniższa kwota z `listCartOptions`
   * (spójnie z checkoutem). Po wyborze metody dostawy = null (używamy wyłącznie `shipping_total`).
   */
  shippingEstimate: number | null;
}

const CART_ID_KEY = "moduly_cart_id";

const CartContext = createContext<CartContextType | null>(null);

/**
 * Wyciąga liczbę (Medusa v2: dziesiętne PLN) z odpowiedzi — czasem przychodzi
 * jako string w BigNumberValue. Używane dla `total` / `subtotal` / `unit_price`
 * na pozycji koszyka.
 */
function numberFromUnknown(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  /* Medusa bywa zwraca BigNumberValue jako `{ value: "179.9", precision: 20 }` —
     szczególnie po niektórych ścieżkach API / proxy. Bez tego `(x as number)`
     daje `[object Object]` i psuje subtotal / express / porównanie z Adminem. */
  if (typeof v === "object" && v !== null && "value" in v) {
    return numberFromUnknown((v as { value: unknown }).value);
  }
  return undefined;
}

function lineItemTotal(item: Record<string, unknown>): number {
  for (const key of ["total", "subtotal"]) {
    const m = numberFromUnknown(item[key]);
    if (m !== undefined && m >= 0) return m;
  }
  const unit = numberFromUnknown(item.unit_price);
  const qty = numberFromUnknown(item.quantity) ?? 1;
  if (unit !== undefined && unit >= 0 && qty > 0) {
    // Zaokrąglamy do groszy (dwa miejsca), nie do pełnych złotych.
    return Math.round(unit * qty * 100) / 100;
  }
  return 0;
}

/** Kwota pozycji PRZED rabatami: subtotal → unit×qty → total (fallbacki). */
function lineItemSubtotal(item: Record<string, unknown>): number {
  const sub = numberFromUnknown(item.subtotal);
  if (sub !== undefined && sub >= 0) return sub;
  const unit = numberFromUnknown(item.unit_price);
  const qty = numberFromUnknown(item.quantity) ?? 1;
  if (unit !== undefined && unit >= 0 && qty > 0) {
    return Math.round(unit * qty * 100) / 100;
  }
  return lineItemTotal(item);
}

function mapCartItems(items: Array<Record<string, unknown>>): CartItem[] {
  return items.map((item) => ({
    id: item.id as string,
    variant_id: item.variant_id as string,
    title: item.title as string,
    thumbnail: resolveCartLineItemThumbnail({
      thumbnail: item.thumbnail as string | null | undefined,
      product: item.product as
        | { thumbnail?: string | null; images?: Array<{ url?: string | null }> | null }
        | null
        | undefined,
    }),
    quantity: Math.max(1, Math.round(numberFromUnknown(item.quantity) ?? 1)),
    unit_price: numberFromUnknown(item.unit_price) ?? 0,
    total: lineItemTotal(item),
    subtotal: lineItemSubtotal(item),
    metadata: item.metadata as Record<string, string> | undefined,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);
  const [cart, setCart] = useState<CartState>({
    id: null,
    items: [],
    subtotal: 0,
    shipping_total: 0,
    hasShippingMethodSelection: false,
    shippingOptionId: null,
    tax_total: 0,
    discount_total: 0,
    total: 0,
    itemCount: 0,
    metadata: {},
    appliedPromoCodes: [],
    expressFeeInTotal: 0,
    courierShippingGross: 0,
  });

  /** Aktualny cart.id do synchronicznych guardów (state bywa o tick za stary). */
  const cartIdRef = useRef<string | null>(null);
  useEffect(() => {
    cartIdRef.current = cart.id;
  }, [cart.id]);

  const normalizeCartMetadata = (raw: unknown): Record<string, string> => {
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
  };

  const updateCartState = useCallback(
    (rawCart: Record<string, unknown>) => {
      // GUARD (incydent 06.07.2026): backend potrafił zwrócić CUDZY koszyk
      // (remoteQuery gubił filtr przy polach z linkiem promotions) — UI
      // nadpisywało stan pustym/cudzym koszykiem („Koszyk (0)" po kliknięciu
      // express). Przyjmujemy wyłącznie payload aktualnego koszyka albo tego
      // wskazanego w localStorage (adopcja między kartami — autorytet).
      const incomingId = typeof rawCart.id === "string" ? rawCart.id : null;
      const currentId = cartIdRef.current;
      if (incomingId && currentId && incomingId !== currentId) {
        let authoritativeId: string | null = null;
        try {
          authoritativeId = localStorage.getItem(CART_ID_KEY);
        } catch {
          /* prywatny tryb */
        }
        if (incomingId !== authoritativeId) {
          console.warn(
            `[cart] odrzucono aktualizację stanu z obcego koszyka (${incomingId} ≠ ${currentId})`,
          );
          return;
        }
      }
      const items = mapCartItems(
        (rawCart.items as Array<Record<string, unknown>>) ?? [],
      );
      const shippingMethods = rawCart.shipping_methods;
      const shippingT = numberFromUnknown(rawCart.shipping_total) ?? 0;
      const methodsArray = Array.isArray(shippingMethods)
        ? (shippingMethods as Array<{
            shipping_option_id?: string;
            name?: string | null;
            amount?: number | string | null;
          }>)
        : [];
      const expressFeeInTotal = expressFeeIncludedInCart(methodsArray);
      // Metoda-dopłata express nie jest wyborem kuriera — pomijamy ją przy
      // wykrywaniu wybranej dostawy.
      const courierMethods = methodsArray.filter(
        (m) => (m.name ?? "").trim() !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
      );
      const firstShippingMethod = courierMethods[0];
      const hasShippingMethodSelection =
        courierMethods.length > 0 || shippingT - expressFeeInTotal > 0;
      // Cena kuriera PRZED rabatami (surowe amount metod, bez metody-dopłaty).
      // `shipping_total` jest PO adjustmentach — przy darmowej dostawie = 0.
      const courierShippingGross =
        Math.round(
          courierMethods.reduce(
            (sum, m) => sum + (numberFromUnknown(m.amount) ?? 0),
            0,
          ) * 100,
        ) / 100;
      const promotions = (rawCart.promotions as Array<{ code?: string }> | undefined) ?? [];
      const appliedPromoCodes = promotions
        .map((promotion) => promotion.code?.trim())
        .filter((code): code is string => Boolean(code));
      setCart({
        id: rawCart.id as string,
        items,
        subtotal: numberFromUnknown(rawCart.subtotal) ?? 0,
        shipping_total: shippingT,
        hasShippingMethodSelection,
        shippingOptionId: firstShippingMethod?.shipping_option_id?.trim() || null,
        tax_total: numberFromUnknown(rawCart.tax_total) ?? 0,
        discount_total: numberFromUnknown(rawCart.discount_total) ?? 0,
        total: numberFromUnknown(rawCart.total) ?? 0,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        metadata: normalizeCartMetadata(rawCart.metadata),
        appliedPromoCodes,
        expressFeeInTotal,
        courierShippingGross,
      });
    },
    [],
  );

  const getOrCreateCart = useCallback(async () => {
    try {
      const rawCart = await bootstrapCartSession();
      if (rawCart) {
        updateCartState(rawCart);
      }
    } catch (e) {
      if (isAbortedFetchError(e)) {
        return;
      }
      const hint = isTransientMedusaError(e)
        ? "Sprawdź, czy Medusa działa (lokalnie :9000 lub Railway) i czy /api/medusa odpowiada."
        : "Sprawdź backend i /api/medusa.";
      console.error(
        `[cart] Nie udało się utworzyć koszyka. ${hint}`,
        e,
      );
    }
  }, [updateCartState]);

  const itemsSignature = useMemo(
    () => cart.items.map((i) => `${i.variant_id}:${i.quantity}`).join(","),
    [cart.items],
  );

  useEffect(() => {
    if (!cart.id || cart.items.length === 0) {
      setShippingEstimate(null);
      return;
    }
    if (cart.hasShippingMethodSelection) {
      setShippingEstimate(null);
      return;
    }

    let cancelled = false;
    invalidateShippingOptionsCache(cart.id);
    void prefetchShippingOptions(cart.id)
      .then((raw) => {
        if (cancelled) return;
        const opts = normalizeShippingOptionsForDisplay(
          raw as unknown as Array<Record<string, unknown>>,
        );
        setShippingEstimate(pickLowestPaidShippingOptionPrice(opts));
      })
      .catch(() => {
        if (!cancelled) setShippingEstimate(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cart.id, cart.hasShippingMethodSelection, itemsSignature]);

  useEffect(() => {
    /**
     * Autorytetem jest Medusa (`metadata.express_delivery` w koszyku).
     * `localStorage` to tylko fallback dla anonima, który kliknął „express"
     * zanim jego koszyk powstał. Po stworzeniu koszyka:
     *   - jeśli Medusa zna wartość → synchronizujemy ją do localStorage,
     *   - jeśli Medusa nic nie ma, a localStorage ma „true" → leniwie
     *     wysyłamy metadata do Medusy (fire-and-forget, bez blokady UI).
     */
    getOrCreateCart().then(() => {
      setIsInitialized(true);
      setCart((c) => {
        const fromServer = c.metadata.express_delivery;
        if (fromServer !== undefined) {
          try {
            localStorage.setItem("moduly_express", fromServer);
          } catch { /* SSR / prywatny tryb */ }
          return c;
        }

        let fromLocal: string | null = null;
        try {
          fromLocal = localStorage.getItem("moduly_express");
        } catch { /* SSR / prywatny tryb */ }

        if (c.id && (fromLocal === "true" || fromLocal === "false")) {
          void cartApi
            .updateCartMetadata(c.id, { express_delivery: fromLocal })
            .catch(() => undefined);
          return {
            ...c,
            metadata: { ...c.metadata, express_delivery: fromLocal },
          };
        }
        return c;
      });
    });
  }, [getOrCreateCart]);

  /**
   * Synchronizacja koszyka między kartami przeglądarki. Po awarii backendu
   * mogły powstać dwa koszyki: stara karta trzymała w pamięci koszyk A,
   * a nowa zapisała do localStorage koszyk B. Każda karta pokazywała „swój"
   * i pozycje przeskakiwały przy przełączaniu. Autorytet: `moduly_cart_id`
   * w localStorage — przy focusie/zmianie w innej karcie adoptujemy go.
   */
  useEffect(() => {
    const adoptCartFromStorage = () => {
      let savedId: string | null;
      try {
        savedId = localStorage.getItem(CART_ID_KEY);
      } catch {
        return;
      }
      if (!savedId || savedId === cart.id) return;
      void cartApi
        .getCart(savedId)
        .then((raw) =>
          updateCartState(raw as unknown as Record<string, unknown>),
        )
        .catch(() => undefined);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_ID_KEY) adoptCartFromStorage();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", adoptCartFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", adoptCartFromStorage);
    };
  }, [cart.id, updateCartState]);

  /**
   * Trwające operacje add-to-cart, kluczowane `variantId + fingerprint opcji`.
   * Pozwala scalić równoległe/double-click dodania tej samej konfiguracji w
   * jeden request (Medusa nie scala równoległych `createLineItem` po metadata,
   * więc bez tego powstawały zdublowane pozycje).
   */
  const inFlightAddsRef = useRef<Map<string, Promise<void>>>(new Map());

  const addItem = useCallback(
    async (
      variantId: string,
      quantity = 1,
      metadata?: Record<string, string>,
      openDrawer = true,
      preview?: { title: string; thumbnail?: string; unit_price: number },
    ): Promise<void> => {
      if (!cart.id) return;
      // Zawężenie do `string` zachowane w domknięciu `run` (cart.id to string|null).
      const cartId = cart.id;

      // Idempotencja / tolerancja na double-click — dołącz do trwającej operacji
      // dla tej samej konfiguracji zamiast wysyłać drugi request.
      const dedupeKey = `${variantId}:${cartLineConfigFingerprint(metadata)}`;
      const pendingAdd = inFlightAddsRef.current.get(dedupeKey);
      if (pendingAdd) {
        if (openDrawer) setIsOpen(true);
        return pendingAdd;
      }

      const run = async (): Promise<void> => {
      /**
       * Klient dodaje nowy produkt = chce kupować dalej. Kasujemy flagę
       * „zamówienie złożone", żeby /checkout nie cofał go na potwierdzenie
       * poprzedniego zamówienia.
       */
      clearCheckoutCompleted();

      /**
       * Optymistyczny render: gdy mamy `preview`, natychmiast pokazujemy
       * pozycję w drawerze (0 ms percepcji), a request do backendu leci
       * w tle. Jeśli ten sam variant_id już jest w koszyku — tylko
       * podbijamy ilość w tymczasowym stanie. `optimistic: true` pozwala
       * UI pokazać lekki wskaźnik „zapisywanie…" dla świeżej linii.
       *
       * Po sukcesie backendu: `updateCartState` z prawdziwego response
       * nadpisuje całą listę i flagi znikają (nowa linia ma stałe `id`
       * z Medusy). Po błędzie: cofamy zmianę i rzucamy do wywołującego.
       */
      const optimisticId = `optimistic:${variantId}:${Date.now()}`;
      let didOptimisticRender = false;

      if (preview) {
        didOptimisticRender = true;
        setCart((c) => {
          const fp = cartLineConfigFingerprint(metadata);
          const existing = c.items.find(
            (i) =>
              i.variant_id === variantId &&
              cartLineConfigFingerprint(i.metadata) === fp,
          );
          let items: CartItem[];
          if (existing) {
            items = c.items.map((i) =>
              i.variant_id === variantId &&
              cartLineConfigFingerprint(i.metadata) === fp
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    total:
                      Math.round(
                        (i.unit_price * (i.quantity + quantity)) * 100,
                      ) / 100,
                    optimistic: true,
                  }
                : i,
            );
          } else {
            items = [
              ...c.items,
              {
                id: optimisticId,
                variant_id: variantId,
                title: preview.title,
                thumbnail: preview.thumbnail,
                quantity,
                unit_price: preview.unit_price,
                total:
                  Math.round(preview.unit_price * quantity * 100) / 100,
                subtotal:
                  Math.round(preview.unit_price * quantity * 100) / 100,
                metadata,
                optimistic: true,
              },
            ];
          }
          const newSubtotal =
            Math.round(
              (c.subtotal + preview.unit_price * quantity) * 100,
            ) / 100;
          return {
            ...c,
            items,
            subtotal: newSubtotal,
            total:
              Math.round(
                (c.total + preview.unit_price * quantity) * 100,
              ) / 100,
            itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          };
        });
        if (openDrawer) setIsOpen(true);
      }

      setIsLoading(true);
      try {
        try {
          const updated = await cartApi.addLineItem(
            cartId,
            variantId,
            quantity,
            metadata,
          );
          updateCartState(updated as unknown as Record<string, unknown>);
          if (openDrawer && !didOptimisticRender) setIsOpen(true);
          return;
        } catch (e) {
          /**
           * Jeśli aktualny koszyk jest już sfinalizowany (Medusa zwraca 400
           * „Cart is already completed"), albo nie istnieje (404), tworzymy
           * świeży i powtarzamy add-to-cart. Bez tego user po nieudanej
           * finalizacji nie mógł dodać niczego nowego („Nie udało się dodać
           * produktu do koszyka") i utykał.
           */
          const msg = (e as { message?: string })?.message ?? "";
          const status =
            (e as { status?: number })?.status ??
            (e as { response?: { status?: number } })?.response?.status ??
            0;
          const isCompleted = /already\s+completed/i.test(msg);
          /** Tylko brak koszyka — nie „Variant not found” itp. */
          const isCartMissing =
            status === 404 ||
            (/\bcart\b/i.test(msg) && /not\s+found/i.test(msg));
          if (!isCompleted && !isCartMissing) throw e;

          try {
            localStorage.removeItem(CART_ID_KEY);
          } catch {
            /* prywatny tryb */
          }
          const fresh = (await cartApi.createCart()) as unknown as Record<
            string,
            unknown
          >;
          const freshId = fresh.id as string;
          try {
            localStorage.setItem(CART_ID_KEY, freshId);
          } catch {
            /* prywatny tryb */
          }
          const updated = await cartApi.addLineItem(
            freshId,
            variantId,
            quantity,
            metadata,
          );
          updateCartState(updated as unknown as Record<string, unknown>);
          if (openDrawer && !didOptimisticRender) setIsOpen(true);
        }
      } catch (e) {
        console.error("[cart] addItem", e);
        /**
         * Cofamy optymistyczną zmianę — skoro backend odrzucił, UI musi
         * wrócić do stanu sprzed kliknięcia, inaczej user zobaczy
         * „zombie" pozycję, której nie może usunąć (bo Medusa jej nie zna).
         */
        if (didOptimisticRender) {
          setCart((c) => {
            const items = c.items.filter((i) => i.id !== optimisticId);
            const subtotal = items.reduce((s, i) => s + i.total, 0);
            return {
              ...c,
              items,
              subtotal,
              total: subtotal,
              itemCount: items.reduce((s, i) => s + i.quantity, 0),
            };
          });
        }
        throw e;
      } finally {
        setIsLoading(false);
      }
      };

      const op = run();
      inFlightAddsRef.current.set(dedupeKey, op);
      try {
        await op;
      } finally {
        inFlightAddsRef.current.delete(dedupeKey);
      }
    },
    [cart.id, updateCartState],
  );

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart.id) return;
      setIsLoading(true);
      try {
        const updated = await cartApi.updateLineItem(
          cart.id,
          lineItemId,
          quantity,
        );
        updateCartState(updated as unknown as Record<string, unknown>);
      } catch (e) {
        console.error("[cart] updateItem", e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [cart.id, updateCartState],
  );

  /**
   * Bezpieczne usunięcie linii. Wcześniej po `removeLineItem` wołaliśmy
   * `getOrCreateCart()`, który przy timeoutzie Medusy tworzył NOWY koszyk
   * i klient tracił całą zawartość. Teraz: próbujemy odświeżyć koszyk
   * przez `getCart()` (bez tworzenia nowego); w razie błędu logujemy
   * i zachowujemy ostatni znany stan — użytkownik może spróbować
   * ponownie lub przeładować stronę.
   */
  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart.id) return;
      setIsLoading(true);
      try {
        await cartApi.removeLineItem(cart.id, lineItemId);
        try {
          const refreshed = await cartApi.getCart(cart.id);
          updateCartState(refreshed as unknown as Record<string, unknown>);
        } catch (refreshErr) {
          console.warn("[cart] removeItem: refresh nie powiódł się", refreshErr);
          setCart((c) => {
            const items = c.items.filter((i) => i.id !== lineItemId);
            const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
            return { ...c, items, itemCount };
          });
        }
      } catch (e) {
        console.error("[cart] removeItem", e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [cart.id, updateCartState],
  );

  const refreshCart = useCallback(async () => {
    await getOrCreateCart();
  }, [getOrCreateCart]);

  const applyDiscount = useCallback(
    async (code: string) => {
      if (!cart.id) return;
      const normalized = code.trim().toUpperCase();
      const alreadyApplied = cart.appliedPromoCodes.some(
        (promoCode) => promoCode.toUpperCase() === normalized,
      );
      if (alreadyApplied) {
        throw new Error("Kod wykorzystany");
      }

      setIsLoading(true);
      try {
        const updated = await cartApi.applyPromotionCode(cart.id, code);
        updateCartState(updated as unknown as Record<string, unknown>);
        const discount = numberFromUnknown(
          (updated as Record<string, unknown>).discount_total,
        ) ?? 0;
        const promotions =
          ((updated as Record<string, unknown>).promotions as Array<{ code?: string }>) ??
          [];
        const hasCode = promotions.some(
          (promotion) => promotion.code?.toUpperCase() === normalized,
        );
        if (discount <= 0 && !hasCode) {
          throw new Error("Kod nieprawidłowy lub wygasł");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cart.appliedPromoCodes, cart.id, updateCartState],
  );

  const removeDiscount = useCallback(
    async (code: string) => {
      if (!cart.id) return;
      setIsLoading(true);
      try {
        const updated = await cartApi.removePromotionCode(cart.id, code);
        updateCartState(updated as unknown as Record<string, unknown>);
      } finally {
        setIsLoading(false);
      }
    },
    [cart.id, updateCartState],
  );

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  /** Ostatnie zapisane żądanie express — ignorujemy przestarzałe odpowiedzi API. */
  const expressSaveSeq = useRef(0);

  const setExpressDelivery = useCallback(
    async (enabled: boolean) => {
      const seq = ++expressSaveSeq.current;
      const value = enabled ? "true" : "false";

      setCart((c) => ({
        ...c,
        metadata: { ...c.metadata, express_delivery: value },
      }));

      try {
        localStorage.setItem("moduly_express", value);
      } catch { /* SSR / prywatny tryb */ }

      if (!cart.id) return;

      const updated = await cartApi.updateCartMetadata(cart.id, {
        express_delivery: value,
      });
      if (seq !== expressSaveSeq.current) return;
      if (updated) {
        updateCartState(updated as unknown as Record<string, unknown>);
      }
    },
    [cart.id, updateCartState],
  );

  const value = useMemo(() => {
    const ed = cart.metadata.express_delivery;
    const expressDelivery = ed === "true" || ed === "1";
    const productsSubtotal =
      Math.round(
        cart.items.reduce((s, i) => s + i.total, 0) * 100,
      ) / 100;
    // Dopłata express to 50% sumy pozycji — zaokrąglamy do groszy (2 miejsc po
    // przecinku), nie do pełnych złotych. Gdy backend już wliczył dopłatę w
    // total (metoda-dopłata z prepare-checkout), surcharge = 0, inaczej
    // doliczylibyśmy ją drugi raz.
    const expressSurcharge =
      expressDelivery && cart.expressFeeInTotal <= 0
        ? Math.round(productsSubtotal * 0.5 * 100) / 100
        : 0;
    const productsPreDiscount =
      Math.round(
        cart.items.reduce((s, i) => s + (i.subtotal > 0 ? i.subtotal : i.total), 0) *
          100,
      ) / 100;
    // Zniżka na dostawę = surowa cena kuriera − kurier PO adjustmentach
    // (shipping_total zawiera metodę-dopłatę express, więc ją zdejmujemy).
    const courierShippingNet = Math.max(
      0,
      Math.round((cart.shipping_total - cart.expressFeeInTotal) * 100) / 100,
    );
    const shippingDiscount = Math.max(
      0,
      Math.round((cart.courierShippingGross - courierShippingNet) * 100) / 100,
    );
    const hasFreeShippingPromo = hasFreeShippingPromotion(cart.appliedPromoCodes);
    const shippingAddon = cart.hasShippingMethodSelection
      ? 0
      : resolveEffectiveShippingCost({
          hasFreeShippingPromo,
          hasShippingMethodSelection: cart.hasShippingMethodSelection,
          courierShippingTotal: cart.courierShippingGross,
          shippingEstimate,
        }) ?? 0;
    // Dopłata express do sumy: client-side surcharge ALBO metoda-dopłata już
    // wliczona przez backend (prepare-checkout) — nigdy obie (patrz fix #5:
    // „kwota pokazana = pobrana”).
    const expressFeeEffective =
      expressSurcharge > 0 ? expressSurcharge : cart.expressFeeInTotal;
    /**
     * AUTORYTET KWOTY (bug 06.07.2026 wieczór): gdy metoda dostawy JEST w
     * koszyku, `cart.total` z Medusy zawiera już WSZYSTKO — pozycje po
     * rabatach, kuriera, dopłatę express i adjustmenty promocji (darmowa
     * dostawa). Poprzednie ręczne przeliczanie przy promocji fs gubiło
     * rabat („Do zapłaty" bez −25) i zależało od detekcji hasFreeShipping,
     * która nie rozpoznawała kodów fs-only (MODULYTEST). Backend gwarantuje
     * (ensureCartShippingForPromo), że promocja dostawy ma metodę w koszyku,
     * więc gałąź ręczna zostaje tylko dla koszyka BEZ wybranej dostawy.
     */
    const grandTotal = cart.hasShippingMethodSelection
      ? Math.round((cart.total + expressSurcharge) * 100) / 100
      : Math.round(
          (productsSubtotal + expressFeeEffective + shippingAddon + cart.tax_total) *
            100,
        ) / 100;
    return {
      ...cart,
      isLoading,
      isInitialized,
      isOpen,
      openCart,
      closeCart,
      addItem,
      updateItem,
      removeItem,
      refreshCart,
      applyDiscount,
      removeDiscount,
      discountTotal: cart.discount_total,
      appliedPromoCodes: cart.appliedPromoCodes,
      expressDelivery,
      setExpressDelivery,
      expressSurcharge,
      productsSubtotal,
      productsPreDiscount,
      shippingDiscount,
      grandTotal,
      shippingEstimate,
    };
  }, [
    cart,
    isLoading,
    isInitialized,
    isOpen,
    openCart,
    closeCart,
    addItem,
    updateItem,
    removeItem,
    refreshCart,
    applyDiscount,
    removeDiscount,
    setExpressDelivery,
    shippingEstimate,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within CartProvider");
  }
  return context;
}
