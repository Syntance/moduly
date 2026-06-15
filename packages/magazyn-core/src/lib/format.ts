import { defaultModulyConfig } from "@moduly/config";

export type FormatOptions = {
	currency?: string;
	locale?: string;
};

/**
 * Formatowanie pieniędzy. W logice pieniądze trzymamy ZAWSZE w najmniejszej
 * jednostce (grosze/cents) jako integer. Format tylko w UI.
 */
export function formatPrice(
	minorAmount: number,
	options: FormatOptions = {},
): string {
	const currency = (options.currency ?? defaultModulyConfig.commerce.currency).toUpperCase();
	const locale = options.locale ?? defaultModulyConfig.commerce.locale;
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(minorAmount / 100);
}

/**
 * Medusa v2 (store cart + admin order fields) zwraca PLN jako decimal (1 = 1 zł).
 * Magazyn / maile operują na groszach (integer).
 */
export function toMinorUnitsFromDecimal(amount: number | null | undefined): number {
	if (amount == null || !Number.isFinite(amount)) return 0;
	return Math.round(amount * 100);
}

export function formatDateTime(iso: string, locale = defaultModulyConfig.commerce.locale): string {
	if (!iso) return "—";
	return new Intl.DateTimeFormat(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(iso));
}
