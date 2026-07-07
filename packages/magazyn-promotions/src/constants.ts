/** Wewnętrzny prefix kodu promocji darmowej dostawy powiązanej z głównym kodem. */
export const MODULY_FS_PREFIX = "__moduly_fs_";

/** Atrybut Medusa dla targetowania produktów w promocji. */
export const MODULY_PRODUCT_RULE_ATTR = "items.product.id";

/** Atrybut Medusa dla minimalnej wartości koszyka (grosze). */
export const MODULY_SUBTOTAL_RULE_ATTR = "subtotal";

/** Atrybut target-reguły promocji dostawy: nazwa metody wysyłki. */
export const MODULY_SHIPPING_NAME_RULE_ATTR = "name";

/**
 * Nazwa metody-dopłaty ekspresowej — źródło prawdy w @moduly/magazyn-core
 * (współdzielone z magazyn-orders). Promocje "darmowa dostawa" (100% na
 * shipping_methods) wykluczają ją regułą `name ne`, inaczej kod darmowej
 * dostawy zerował także dopłatę express (bug 06.07.2026: −27,50 zamiast −25).
 */
export { EXPRESS_FEE_SHIPPING_METHOD_NAME } from "@moduly/magazyn-core";

export function freeShippingPromotionCode(mainPromotionId: string): string {
	return `${MODULY_FS_PREFIX}${mainPromotionId}`;
}

export function isShadowFreeShippingCode(code: string): boolean {
	return code.startsWith(MODULY_FS_PREFIX);
}
