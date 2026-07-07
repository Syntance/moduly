/**
 * Nazwa metody wysyłki niosącej dopłatę ekspresową — MUSI być identyczna ze
 * stałą backendu (`apps/backend/src/lib/express-fee.ts`). Backend dodaje ją
 * do koszyka w `prepare-checkout`, dzięki czemu dopłata wchodzi do
 * `cart.total` i P24 pobiera dokładnie kwotę pokazaną klientowi.
 */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "Dopłata ekspresowa (+50%)";

export type ShippingMethodLike = {
  name?: string | null;
  amount?: number | string | null;
};

/** Kwota dopłaty express już wliczonej w total koszyka (0 = brak metody-dopłaty). */
export function expressFeeIncludedInCart(
  shippingMethods: ShippingMethodLike[] | null | undefined,
): number {
  for (const method of shippingMethods ?? []) {
    if ((method.name ?? "").trim() !== EXPRESS_FEE_SHIPPING_METHOD_NAME) continue;
    const amount = Number(method.amount ?? 0);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}
