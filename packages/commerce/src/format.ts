/**
 * Medusa v2 (store cart + admin order fields) zwraca PLN jako decimal (1 = 1 zł).
 * Logika biznesowa operuje na groszach (integer).
 */
export function toMinorUnitsFromDecimal(amount: number | null | undefined): number {
	if (amount == null || !Number.isFinite(amount)) return 0;
	return Math.round(amount * 100);
}

/** Formatowanie kwoty w groszach do PLN w UI. */
export function formatPrice(minorAmount: number, locale = "pl-PL", currency = "PLN"): string {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(minorAmount / 100);
}
