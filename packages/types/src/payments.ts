/** Identyfikatory providerów płatności zgodne z Medusa v2. */
export type PaymentProvider =
	| "pp_przelewy24_przelewy24"
	| "pp_stripe_stripe"
	| "pp_tpay_tpay"
	| "pp_system_default";

export type PaymentSessionStatus =
	| "pending"
	| "authorized"
	| "captured"
	| "canceled"
	| "refunded";

export interface PaymentSession {
	id: string;
	provider_id: PaymentProvider;
	status: PaymentSessionStatus;
	data: Record<string, unknown>;
}

export type ShippingProvider =
	| "inpost_parcel_locker"
	| "inpost_courier"
	| "dpd_courier";

export interface ShippingMethod {
	id: string;
	name: string;
	/** Cena wysyłki w groszach. */
	price: number;
	provider: ShippingProvider;
	estimated_delivery: string;
}
