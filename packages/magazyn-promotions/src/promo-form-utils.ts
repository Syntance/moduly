import type { AdminPromoCode, PromoCodeInput } from "./types";

export function promoCodeToFormValues(promo: AdminPromoCode): PromoCodeInput {
	// discountValue i freeShippingMinAmount są w PLN (major units) — bez konwersji.
	const discountValueMajor =
		promo.discountType === "percentage" || promo.discountType === "fixed"
			? promo.discountValue
			: 0;

	return {
		code: promo.code,
		status: promo.status === "inactive" ? "draft" : promo.status,
		discountType: promo.discountType,
		discountValueMajor,
		productIds: promo.productIds,
		freeShippingEnabled: promo.freeShippingEnabled,
		freeShippingMinAmountMajor:
			promo.freeShippingMinAmount && promo.freeShippingMinAmount > 0
				? promo.freeShippingMinAmount
				: null,
	};
}

export function formatPromoDiscountLabel(promo: AdminPromoCode): string {
	if (promo.discountType === "percentage") return `−${promo.discountValue}%`;
	if (promo.discountType === "fixed") {
		// discountValue jest w PLN (major units)
		return `−${promo.discountValue.toLocaleString("pl-PL", {
			style: "currency",
			currency: "PLN",
		})}`;
	}
	if (promo.freeShippingEnabled) return "Darmowa dostawa";
	return "—";
}

export function formatPromoScopeLabel(promo: AdminPromoCode, productTitleById: Map<string, string>): string {
	if (promo.productIds.length === 0) return "Całe zamówienie";
	const names = promo.productIds
		.map((id) => productTitleById.get(id))
		.filter((name): name is string => Boolean(name));
	if (names.length === 0) return `${promo.productIds.length} produktów`;
	if (names.length <= 2) return names.join(", ");
	return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
