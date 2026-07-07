import "server-only";
import { adminFetch } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	EXPRESS_FEE_SHIPPING_METHOD_NAME,
	freeShippingPromotionCode,
	isShadowFreeShippingCode,
	MODULY_FS_PREFIX,
	MODULY_PRODUCT_RULE_ATTR,
	MODULY_SHIPPING_NAME_RULE_ATTR,
	MODULY_SUBTOTAL_RULE_ATTR,
} from "./constants";
import type { AdminPromoCode, ProductOption, PromoCodeInput, PromoDiscountType } from "./types";

export type { AdminPromoCode, ProductOption, PromoCodeInput } from "./types";

const CURRENCY = getModulyConfig().commerce.currency.toLowerCase();

const PROMOTION_LIST_FIELDS = [
	"id",
	"code",
	"status",
	"type",
	"is_automatic",
	"application_method.id",
	"application_method.type",
	"application_method.target_type",
	"application_method.value",
	"application_method.currency_code",
	"application_method.target_rules.id",
	"application_method.target_rules.attribute",
	"application_method.target_rules.operator",
	"application_method.target_rules.values.value",
	"rules.id",
	"rules.attribute",
	"rules.operator",
	"rules.values.value",
].join(",");

type MedusaRulePayload = {
	attribute: string;
	operator: string;
	values: string[];
};

type MedusaRuleValue = { value?: string | null };
type MedusaRule = {
	id?: string;
	attribute?: string;
	operator?: string;
	values?: MedusaRuleValue[] | null;
};

type MedusaApplicationMethod = {
	id?: string;
	type?: string;
	target_type?: string;
	value?: number;
	currency_code?: string | null;
	target_rules?: MedusaRule[] | null;
};

type MedusaPromotion = {
	id: string;
	code: string;
	status?: string;
	type?: string;
	is_automatic?: boolean;
	application_method?: MedusaApplicationMethod | null;
	rules?: MedusaRule[] | null;
};

function ruleValues(rule: MedusaRule | undefined): string[] {
	if (!rule?.values) return [];
	return rule.values
		.map((entry) => entry.value?.trim())
		.filter((value): value is string => Boolean(value));
}

function parseProductIds(promotion: MedusaPromotion): string[] {
	const targetRules = promotion.application_method?.target_rules ?? [];
	for (const rule of targetRules) {
		if (rule.attribute === MODULY_PRODUCT_RULE_ATTR) {
			return ruleValues(rule);
		}
	}
	return [];
}

function parseFreeShippingMinPln(promotion: MedusaPromotion): number | null {
	const rules = promotion.rules ?? [];
	for (const rule of rules) {
		if (rule.attribute === MODULY_SUBTOTAL_RULE_ATTR && rule.operator === "gte") {
			const raw = ruleValues(rule)[0];
			if (!raw) return null;
			const parsed = Number(raw);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
		}
	}
	return null;
}

function parseDiscountType(promotion: MedusaPromotion): PromoDiscountType {
	const method = promotion.application_method;
	if (!method) return "none";
	if (method.target_type === "shipping_methods") return "none";
	if (method.type === "percentage") return "percentage";
	if (method.type === "fixed") return "fixed";
	return "none";
}

function parseDiscountValue(promotion: MedusaPromotion): number {
	const method = promotion.application_method;
	if (!method?.value) return 0;
	return method.value;
}

function isFreeShippingOnlyPromotion(promotion: MedusaPromotion): boolean {
	const method = promotion.application_method;
	return method?.target_type === "shipping_methods" && parseDiscountType(promotion) === "none";
}

function toAdminPromoCode(
	promotion: MedusaPromotion,
	shadowByMainId: Map<string, MedusaPromotion>,
): AdminPromoCode | null {
	if (isShadowFreeShippingCode(promotion.code)) return null;

	const shadow = shadowByMainId.get(promotion.id) ?? null;
	const freeShippingOnly = isFreeShippingOnlyPromotion(promotion);

	let discountType = parseDiscountType(promotion);
	let discountValue = parseDiscountValue(promotion);
	const freeShippingEnabled = freeShippingOnly || shadow !== null;
	const freeShippingMinAmount = freeShippingOnly
		? parseFreeShippingMinPln(promotion)
		: shadow
			? parseFreeShippingMinPln(shadow)
			: null;

	if (freeShippingOnly) {
		discountType = "none";
		discountValue = 0;
	}

	const status = promotion.status === "active" ? "active" : promotion.status === "inactive" ? "inactive" : "draft";

	return {
		id: promotion.id,
		code: promotion.code,
		status,
		discountType,
		discountValue,
		productIds: parseProductIds(promotion),
		freeShippingEnabled,
		freeShippingMinAmount,
		freeShippingPromotionId: shadow?.id ?? null,
	};
}

async function fetchAllPromotions(): Promise<MedusaPromotion[]> {
	const data = await adminFetch<{ promotions: MedusaPromotion[] }>(
		`/admin/promotions?limit=200&fields=${PROMOTION_LIST_FIELDS}`,
	);
	return data.promotions ?? [];
}

function buildShadowMap(promotions: MedusaPromotion[]): Map<string, MedusaPromotion> {
	const map = new Map<string, MedusaPromotion>();
	for (const promotion of promotions) {
		if (!isShadowFreeShippingCode(promotion.code)) continue;
		const mainId = promotion.code.slice(MODULY_FS_PREFIX.length);
		if (mainId) map.set(mainId, promotion);
	}
	return map;
}

export async function listPromoCodes(): Promise<AdminPromoCode[]> {
	const all = await fetchAllPromotions();
	const shadowMap = buildShadowMap(all);
	return all
		.map((promotion) => toAdminPromoCode(promotion, shadowMap))
		.filter((promotion): promotion is AdminPromoCode => promotion !== null)
		.sort((a, b) => a.code.localeCompare(b.code, "pl"));
}

export async function listPromoCodesForProduct(productId: string): Promise<AdminPromoCode[]> {
	const all = await listPromoCodes();
	return all.filter(
		(promo) => promo.productIds.length === 0 || promo.productIds.includes(productId),
	);
}

export async function listProductOptionsForPromo(): Promise<ProductOption[]> {
	const data = await adminFetch<{ products: Array<{ id: string; title: string }> }>(
		"/admin/products?limit=200&fields=id,title",
	);
	return (data.products ?? []).map((product) => ({
		id: product.id,
		title: product.title,
	}));
}

function buildTargetRules(productIds: string[]): MedusaRulePayload[] | undefined {
	if (productIds.length === 0) return undefined;
	return [
		{
			attribute: MODULY_PRODUCT_RULE_ATTR,
			operator: "in",
			values: productIds,
		},
	];
}

function buildSubtotalRules(minPln: number | null): MedusaRulePayload[] | undefined {
	if (!minPln || minPln <= 0) return undefined;
	return [
		{
			attribute: MODULY_SUBTOTAL_RULE_ATTR,
			operator: "gte",
			values: [String(minPln)],
		},
	];
}

type CreatePromotionBody = {
	code: string;
	type: "standard";
	status: "active" | "draft";
	is_automatic: false;
	application_method: {
		type: string;
		target_type: string;
		value: number;
		allocation: "across";
		currency_code?: string;
		target_rules?: MedusaRulePayload[];
	};
	rules?: MedusaRulePayload[];
};

function buildDiscountPromotionBody(
	input: PromoCodeInput,
	discountValue: number,
): CreatePromotionBody {
	const hasProducts = input.productIds.length > 0;
	const targetRules = buildTargetRules(input.productIds);

	if (input.discountType === "none") {
		throw new Error("Brak rabatu — użyj promocji dostawy.");
	}

	return {
		code: input.code.trim().toUpperCase(),
		type: "standard",
		status: input.status,
		is_automatic: false,
		application_method: {
			type: input.discountType,
			target_type: hasProducts ? "items" : "order",
			value: discountValue,
			allocation: "across",
			...(input.discountType === "fixed" ? { currency_code: CURRENCY } : {}),
			...(targetRules ? { target_rules: targetRules } : {}),
		},
	};
}

/**
 * Target-reguła wykluczająca metodę-dopłatę express z promocji "darmowa
 * dostawa" — bez niej 100% na shipping_methods zerowało też dopłatę +50%
 * (klient dostawał express gratis; bug 06.07.2026).
 */
function buildExpressExclusionRule(): MedusaRulePayload {
	return {
		attribute: MODULY_SHIPPING_NAME_RULE_ATTR,
		operator: "ne",
		values: [EXPRESS_FEE_SHIPPING_METHOD_NAME],
	};
}

function buildFreeShippingPromotionBody(
	code: string,
	status: "active" | "draft",
	minPln: number | null,
): CreatePromotionBody {
	return {
		code,
		type: "standard",
		status,
		is_automatic: false,
		application_method: {
			type: "percentage",
			target_type: "shipping_methods",
			value: 100,
			allocation: "across",
			target_rules: [buildExpressExclusionRule()],
		},
		rules: buildSubtotalRules(minPln),
	};
}

/**
 * Dopina regułę wykluczenia dopłaty express do ISTNIEJĄCEJ promocji dostawy
 * (ścieżki update nie przebudowują application_method.target_rules).
 * Idempotentne: nic nie robi, gdy reguła już wisi.
 */
async function ensureExpressExclusionTargetRule(promotionId: string): Promise<void> {
	const detail = await adminFetch<{ promotion: MedusaPromotion }>(
		`/admin/promotions/${promotionId}?fields=${PROMOTION_LIST_FIELDS}`,
	);
	const targetRules = detail.promotion.application_method?.target_rules ?? [];
	const already = targetRules.some(
		(rule) =>
			rule.attribute === MODULY_SHIPPING_NAME_RULE_ATTR &&
			rule.operator === "ne" &&
			(rule.values ?? []).some((v) => v.value === EXPRESS_FEE_SHIPPING_METHOD_NAME),
	);
	if (already) return;

	await adminFetch(`/admin/promotions/${promotionId}/target-rules/batch`, {
		method: "POST",
		body: JSON.stringify({
			create: [buildExpressExclusionRule()],
			update: [],
			delete: [],
		}),
	});
}

async function createPromotion(body: CreatePromotionBody): Promise<MedusaPromotion> {
	const data = await adminFetch<{ promotion: MedusaPromotion }>("/admin/promotions", {
		method: "POST",
		body: JSON.stringify(body),
	});
	return data.promotion;
}

async function updatePromotion(
	id: string,
	body: {
		code?: string;
		status?: "active" | "draft";
		application_method?: CreatePromotionBody["application_method"];
	},
): Promise<void> {
	await adminFetch(`/admin/promotions/${id}`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

async function deletePromotion(id: string): Promise<void> {
	await adminFetch(`/admin/promotions/${id}`, { method: "DELETE" });
}

async function replaceTargetRules(promotionId: string, productIds: string[]): Promise<void> {
	const detail = await adminFetch<{ promotion: MedusaPromotion }>(
		`/admin/promotions/${promotionId}?fields=${PROMOTION_LIST_FIELDS}`,
	);
	const existingRules = detail.promotion.application_method?.target_rules ?? [];
	const deleteIds = existingRules.map((rule) => rule.id).filter((id): id is string => Boolean(id));

	const create =
		productIds.length > 0
			? [
					{
						attribute: MODULY_PRODUCT_RULE_ATTR,
						operator: "in",
						values: productIds,
					},
				]
			: [];

	if (deleteIds.length === 0 && (!create || create.length === 0)) return;

	await adminFetch(`/admin/promotions/${promotionId}/target-rules/batch`, {
		method: "POST",
		body: JSON.stringify({
			create: create ?? [],
			update: [],
			delete: deleteIds,
		}),
	});
}

async function replacePromotionRules(promotionId: string, minGrosze: number | null): Promise<void> {
	const detail = await adminFetch<{ promotion: MedusaPromotion }>(
		`/admin/promotions/${promotionId}?fields=${PROMOTION_LIST_FIELDS}`,
	);
	const existingRules = detail.promotion.rules ?? [];
	const deleteIds = existingRules.map((rule) => rule.id).filter((id): id is string => Boolean(id));
	const create = buildSubtotalRules(minGrosze) ?? [];

	await adminFetch(`/admin/promotions/${promotionId}/rules/batch`, {
		method: "POST",
		body: JSON.stringify({
			create: create ?? [],
			update: [],
			delete: deleteIds,
		}),
	});
}

async function syncShadowFreeShipping(
	mainId: string,
	input: PromoCodeInput,
	minPln: number | null,
): Promise<void> {
	const fsCode = freeShippingPromotionCode(mainId);
	const all = await fetchAllPromotions();
	const existing = all.find((p) => p.code === fsCode);

	if (!input.freeShippingEnabled) {
		if (existing) await deletePromotion(existing.id);
		return;
	}

	if (existing) {
		await updatePromotion(existing.id, {
			status: input.status,
			application_method: {
				type: "percentage",
				target_type: "shipping_methods",
				value: 100,
				allocation: "across",
			},
		});
		await replacePromotionRules(existing.id, minPln);
		await ensureExpressExclusionTargetRule(existing.id);
		return;
	}

	await createPromotion(buildFreeShippingPromotionBody(fsCode, input.status, minPln));
}

function resolveDiscountValue(input: PromoCodeInput): number {
	if (input.discountType === "percentage") {
		return Math.min(100, Math.max(1, Math.round(input.discountValueMajor)));
	}
	if (input.discountType === "fixed") {
		// Medusa v2 traktuje value promocji jako PLN (major units) — identycznie
		// jak ceny produktów w koszyku. Wysyłamy PLN bezpośrednio.
		// (Wcześniej wysyłano grosze ×100, co powodowało zniżkę 990 PLN zamiast
		// 9,90 PLN — produkt stawał się darmowy przez obcięcie do ceny produktu.)
		return input.discountValueMajor;
	}
	return 0;
}

export async function createPromoCode(input: PromoCodeInput): Promise<void> {
	const code = input.code.trim().toUpperCase();
	if (!code) throw new Error("Kod promocyjny jest wymagany.");

	const hasDiscount = input.discountType !== "none";
	const minPln =
		input.freeShippingEnabled && input.freeShippingMinAmountMajor && input.freeShippingMinAmountMajor > 0
			? input.freeShippingMinAmountMajor
			: null;

	if (!hasDiscount && !input.freeShippingEnabled) {
		throw new Error("Wybierz rabat lub darmową dostawę.");
	}

	if (hasDiscount && input.discountType === "fixed" && (!Number.isFinite(input.discountValueMajor) || input.discountValueMajor <= 0)) {
		throw new Error("Kwota rabatu musi być większa od zera.");
	}

	if (hasDiscount && input.discountType === "percentage" && (!Number.isFinite(input.discountValueMajor) || input.discountValueMajor <= 0)) {
		throw new Error("Procent rabatu musi być większy od zera.");
	}

	if (input.freeShippingEnabled && !hasDiscount) {
		await createPromotion(
			buildFreeShippingPromotionBody(code, input.status, minPln),
		);
		return;
	}

	const discountValue = resolveDiscountValue(input);
	const main = await createPromotion(buildDiscountPromotionBody({ ...input, code }, discountValue));
	await syncShadowFreeShipping(main.id, { ...input, code }, minPln);
}

export async function updatePromoCode(id: string, input: PromoCodeInput): Promise<void> {
	const all = await fetchAllPromotions();
	const existing = all.find((p) => p.id === id);
	if (!existing || isShadowFreeShippingCode(existing.code)) {
		throw new Error("Nie znaleziono kodu promocyjnego.");
	}

	const code = input.code.trim().toUpperCase();
	const hasDiscount = input.discountType !== "none";
	const minPln =
		input.freeShippingEnabled && input.freeShippingMinAmountMajor && input.freeShippingMinAmountMajor > 0
			? input.freeShippingMinAmountMajor
			: null;

	if (!hasDiscount && !input.freeShippingEnabled) {
		throw new Error("Wybierz rabat lub darmową dostawę.");
	}

	const wasFreeShippingOnly = isFreeShippingOnlyPromotion(existing);

	if (!hasDiscount && input.freeShippingEnabled) {
		if (wasFreeShippingOnly) {
			await updatePromotion(id, {
				code,
				status: input.status,
				application_method: {
					type: "percentage",
					target_type: "shipping_methods",
					value: 100,
					allocation: "across",
				},
			});
			await replacePromotionRules(id, minPln);
			await ensureExpressExclusionTargetRule(id);
			return;
		}

		const shadow = all.find((p) => p.code === freeShippingPromotionCode(id));
		if (shadow) await deletePromotion(shadow.id);
		await deletePromotion(id);
		await createPromotion(buildFreeShippingPromotionBody(code, input.status, minPln));
		return;
	}

	if (wasFreeShippingOnly) {
		await deletePromotion(id);
		const discountValue = resolveDiscountValue(input);
		const main = await createPromotion(
			buildDiscountPromotionBody({ ...input, code }, discountValue),
		);
		await syncShadowFreeShipping(main.id, { ...input, code }, minPln);
		return;
	}

	const discountValue = resolveDiscountValue(input);
	await updatePromotion(id, {
		code,
		status: input.status,
		application_method: {
			type: input.discountType,
			target_type: input.productIds.length > 0 ? "items" : "order",
			value: discountValue,
			allocation: "across",
			...(input.discountType === "fixed" ? { currency_code: CURRENCY } : {}),
		},
	});
	await replaceTargetRules(id, input.productIds);
	await syncShadowFreeShipping(id, { ...input, code }, minPln);
}

export async function deletePromoCode(id: string): Promise<void> {
	const all = await fetchAllPromotions();
	const shadow = all.find((p) => p.code === freeShippingPromotionCode(id));
	if (shadow) await deletePromotion(shadow.id);
	await deletePromotion(id);
}
