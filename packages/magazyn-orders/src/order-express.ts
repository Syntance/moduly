/** Czy zamówienie ma włączoną realizację express (metadata z koszyka). */
export function isExpressDelivery(metadata: Record<string, string>): boolean {
	const value = metadata.express_delivery?.trim().toLowerCase();
	return value === "true" || value === "1";
}

/**
 * Dopłata express z metadata (`express_fee_minor` — historyczna nazwa, wartość w PLN decimal).
 * Gdy brak wpisu, opcjonalnie liczy 50% sumy produktów (grosze).
 */
export function expressFeeMinor(
	metadata: Record<string, string>,
	itemTotalMinor?: number,
): number {
	const raw = metadata.express_fee_minor?.trim();
	if (raw) {
		const n = Number(raw.replace(",", "."));
		if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
	}

	if (itemTotalMinor != null && itemTotalMinor > 0 && isExpressDelivery(metadata)) {
		return Math.round(itemTotalMinor * 0.5);
	}

	return 0;
}

export const EXPRESS_DELIVERY_LABEL = "Express · do 3 dni roboczych";
