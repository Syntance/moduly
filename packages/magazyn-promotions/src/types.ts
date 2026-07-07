export type PromoDiscountType = "percentage" | "fixed" | "none";

export type AdminPromoCode = {
	id: string;
	code: string;
	status: "active" | "draft" | "inactive";
	discountType: PromoDiscountType;
	/** Procent (1–100) lub kwota w PLN (major units) dla fixed. */
	discountValue: number;
	productIds: string[];
	freeShippingEnabled: boolean;
	/** Minimalna wartość koszyka dla darmowej dostawy (PLN). null = bez progu. */
	freeShippingMinAmount: number | null;
	/** ID powiązanej promocji darmowej dostawy (gdy rabat + dostawa). */
	freeShippingPromotionId: string | null;
};

export type PromoCodeInput = {
	code: string;
	status: "active" | "draft";
	discountType: PromoDiscountType;
	/** Dla UI: procent lub PLN (major) — konwersja w store. */
	discountValueMajor: number;
	productIds: string[];
	freeShippingEnabled: boolean;
	/** PLN (major) — konwersja do groszy w store. */
	freeShippingMinAmountMajor: number | null;
};

export type ProductOption = {
	id: string;
	title: string;
};
