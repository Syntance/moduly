import type { PaymentProvider } from "@moduly/types";

/** Pełny id providera Przelewy24 w Medusie: `pp_{provider.id}_{service.identifier}`. */
export const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24" as const satisfies PaymentProvider;

export const STRIPE_PROVIDER_ID = "pp_stripe_stripe" as const satisfies PaymentProvider;

export const TPAY_PROVIDER_ID = "pp_tpay_tpay" as const satisfies PaymentProvider;

export const SYSTEM_PAYMENT_PROVIDER_ID = "pp_system_default" as const satisfies PaymentProvider;

/** Providery produkcyjne — kolejność = priorytet (ADR 002 + Stripe/tpay). */
export const PRODUCTION_PAYMENT_PROVIDER_IDS = [
	PRZELEWY24_PROVIDER_ID,
	STRIPE_PROVIDER_ID,
	TPAY_PROVIDER_ID,
] as const;

export function isProductionProvider(providerId: string): boolean {
	return (PRODUCTION_PAYMENT_PROVIDER_IDS as readonly string[]).includes(providerId);
}

/**
 * Wybiera domyślnego providera płatności: P24 → Stripe → tpay → manual (system).
 * Produkcyjne metody mają priorytet; `pp_system_default` jest ostatnim fallbackiem
 * przed pierwszym dostępnym z listy.
 */
export function pickPreferredProvider(list: Array<{ id: string }>): string | undefined {
	for (const preferredId of PRODUCTION_PAYMENT_PROVIDER_IDS) {
		const match = list.find((p) => p.id === preferredId);
		if (match) return match.id;
	}

	const manual = list.find((p) => p.id === SYSTEM_PAYMENT_PROVIDER_ID);
	if (manual) return manual.id;

	return list[0]?.id;
}
