import { isShadowFreeShippingCode } from "@/lib/promotions/constants";

/** Cień `__moduly_fs_*` — aktywna promocja darmowej dostawy powiązana z kodem klienta. */
export function hasFreeShippingPromotion(
	appliedPromoCodes: readonly string[],
): boolean {
	return appliedPromoCodes.some((code) => isShadowFreeShippingCode(code));
}

export function resolveEffectiveShippingCost(params: {
	hasFreeShippingPromo: boolean;
	hasShippingMethodSelection: boolean;
	courierShippingTotal: number;
	selectedShippingPrice?: number;
	shippingEstimate: number | null;
}): number | null {
	const {
		hasFreeShippingPromo,
		hasShippingMethodSelection,
		courierShippingTotal,
		selectedShippingPrice,
		shippingEstimate,
	} = params;

	if (hasFreeShippingPromo) return 0;
	if (selectedShippingPrice !== undefined) return selectedShippingPrice;
	if (hasShippingMethodSelection) return courierShippingTotal;
	return shippingEstimate;
}
