/** Kontekst checkoutu dla purchase (duration, shipping, payment) — sessionStorage. */
export const CHECKOUT_ANALYTICS_STORAGE_KEY = "moduly.checkout_analytics.v1";

export type CheckoutAnalyticsContext = {
  startedAt?: number;
  shippingMethod?: string;
  paymentMethod?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function writeCheckoutAnalyticsContext(
  partial: CheckoutAnalyticsContext,
): void {
  if (!isBrowser()) return;
  try {
    const current = readCheckoutAnalyticsContext() ?? {};
    const next: CheckoutAnalyticsContext = { ...current, ...partial };
    sessionStorage.setItem(
      CHECKOUT_ANALYTICS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    /* prywatny tryb */
  }
}

export function readCheckoutAnalyticsContext(): CheckoutAnalyticsContext | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_ANALYTICS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutAnalyticsContext;
  } catch {
    return null;
  }
}

export function clearCheckoutAnalyticsContext(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(CHECKOUT_ANALYTICS_STORAGE_KEY);
  } catch {
    /* prywatny tryb */
  }
}

/** Czytelna etykieta metody płatności dla purchase (GA4 payment_type). */
export function paymentMethodAnalyticsLabel(providerId: string): string {
  if (providerId === "pp_przelewy24_przelewy24") return "przelewy24";
  if (providerId === "pp_system_default") return "bank_transfer";
  return providerId;
}
