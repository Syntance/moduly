/** Wewnętrzny prefix kodu promocji darmowej dostawy powiązanej z głównym kodem. */
export const MODULY_FS_PREFIX = "__moduly_fs_";

export function freeShippingPromotionCode(mainPromotionId: string): string {
	return `${MODULY_FS_PREFIX}${mainPromotionId}`;
}

export function isShadowFreeShippingCode(code: string): boolean {
	return code.startsWith(MODULY_FS_PREFIX);
}

type MedusaPromotion = {
	id: string;
	code: string;
	status?: string;
};

/**
 * Zwraca kody do zastosowania: główny + opcjonalny cień darmowej dostawy.
 * Cień nigdy nie jest wpisywany ręcznie przez klienta.
 */
export function resolvePromotionCodesToApply(
	mainCode: string,
	promotions: MedusaPromotion[],
): string[] {
	const normalized = mainCode.trim().toUpperCase();
	if (!normalized || isShadowFreeShippingCode(normalized)) {
		return [];
	}

	const main = promotions.find(
		(promotion) => promotion.code.toUpperCase() === normalized && promotion.status === "active",
	);
	if (!main) return [];

	const codes = [main.code];
	const shadow = promotions.find(
		(promotion) => promotion.code === freeShippingPromotionCode(main.id),
	);
	if (shadow && shadow.status === "active") {
		codes.push(shadow.code);
	}
	return codes;
}
