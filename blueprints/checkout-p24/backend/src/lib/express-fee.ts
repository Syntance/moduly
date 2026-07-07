/**
 * Dopłata ekspresowa jako REALNA pozycja koszyka (metoda wysyłki), nie hack w UI.
 *
 * Kontekst (audyt 06.07.2026): dopłata express żyła wyłącznie w
 * `cart.metadata.express_delivery` + doliczeniu client-side w CartProvider
 * (`total + expressSurcharge`). Provider P24 celowo bierze kwotę TYLKO z
 * `input.amount` (kwota zweryfikowana przez Medusę), więc klient widział na
 * checkoutcie sumę Z dopłatą, a w bramce P24 płacił sumę BEZ niej — rozjazd
 * kwoty pokazanej i pobranej (strata przychodu + ryzyko sporu konsumenckiego).
 *
 * Rozwiązanie: przy `prepare-checkout` dopłata staje się metodą wysyłki
 * o nazwie EXPRESS_FEE_SHIPPING_METHOD_NAME. Wchodzi do `cart.total`, więc
 * Medusa sama pilnuje kwoty przy płatności (P24 = total z dopłatą), a
 * zamówienie/e-maile pokazują ją jawnie.
 *
 * `addShippingMethodToCartWorkflow` usuwa WSZYSTKIE metody koszyka przy
 * każdym wyborze kuriera, więc rekoncyliacja dopłaty musi być wykonywana
 * PO nim — plan poniżej jest idempotentny (konwerguje przy każdym wywołaniu).
 */

export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "Dopłata ekspresowa (+50%)";

export const EXPRESS_FEE_RATE = 0.5;

/** Tolerancja porównań kwot w PLN (floaty ze Store API; 0.005 = pół grosza). */
export const AMOUNT_EPSILON_PLN = 0.005;

/** 50% sumy pozycji, zaokrąglone do grosza — parytet z CartProvider (UI). */
export function computeExpressFeePln(itemSubtotalPln: number): number {
  if (!Number.isFinite(itemSubtotalPln) || itemSubtotalPln <= 0) return 0;
  return Math.round(itemSubtotalPln * EXPRESS_FEE_RATE * 100) / 100;
}

export type ShippingMethodRow = {
  id?: string | null;
  name?: string | null;
  amount?: number | string | null;
};

export type ExpressFeePlan = {
  /** Id metod-dopłat do usunięcia (duplikaty / zła kwota / express wyłączony). */
  deleteIds: string[];
  /** Kwota nowej metody-dopłaty do dodania (null = nic nie dodawaj). */
  addAmount: number | null;
  /** Czy koszyk wymaga zmiany (→ refresh payment collection). */
  changed: boolean;
};

function toAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Plan rekoncyliacji metody-dopłaty: stan koszyka → operacje delete/add.
 * Czysta funkcja (testowalna bez Medusy).
 */
export function planExpressFeeReconcile(params: {
  expressDelivery: boolean;
  itemSubtotal: number;
  methods: ShippingMethodRow[];
}): ExpressFeePlan {
  const feeMethods = params.methods.filter(
    (m) => (m.name ?? "").trim() === EXPRESS_FEE_SHIPPING_METHOD_NAME,
  );
  const expected = params.expressDelivery
    ? computeExpressFeePln(params.itemSubtotal)
    : 0;

  if (expected <= 0) {
    const deleteIds = feeMethods
      .map((m) => m.id?.trim())
      .filter((id): id is string => Boolean(id));
    return { deleteIds, addAmount: null, changed: deleteIds.length > 0 };
  }

  const [first, ...rest] = feeMethods;
  const firstAmount = toAmount(first?.amount);
  const firstMatches =
    first !== undefined &&
    firstAmount !== null &&
    Math.abs(firstAmount - expected) <= AMOUNT_EPSILON_PLN;

  if (firstMatches && rest.length === 0) {
    return { deleteIds: [], addAmount: null, changed: false };
  }

  const deleteIds = feeMethods
    .map((m) => m.id?.trim())
    .filter((id): id is string => Boolean(id));
  return { deleteIds, addAmount: expected, changed: true };
}
