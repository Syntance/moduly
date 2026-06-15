import type { PaymentSession, ShippingMethod } from "./payments";

export interface CartItem {
	id: string;
	cart_id: string;
	variant_id: string;
	product_id: string;
	title: string;
	description: string;
	thumbnail?: string;
	quantity: number;
	/** Cena jednostkowa w groszach. */
	unit_price: number;
	/** Suma pozycji przed rabatami, w groszach. */
	subtotal: number;
	/** Łączna kwota pozycji po rabatach, w groszach. */
	total: number;
	variant: {
		id: string;
		title: string;
		sku: string;
		options: Record<string, string>;
	};
}

export interface Address {
	first_name: string;
	last_name: string;
	company?: string;
	address_1: string;
	address_2?: string;
	city: string;
	postal_code: string;
	country_code: string;
	phone?: string;
}

export interface Cart {
	id: string;
	region_id: string;
	items: CartItem[];
	shipping_methods: ShippingMethod[];
	shipping_address?: Address;
	billing_address?: Address;
	email?: string;
	/** Suma pozycji w groszach. */
	subtotal: number;
	/** Koszt wysyłki w groszach. */
	shipping_total: number;
	/** Podatek w groszach. */
	tax_total: number;
	/** Rabat w groszach. */
	discount_total: number;
	/** Kwota końcowa w groszach. */
	total: number;
	payment_session?: PaymentSession;
}

export type CompleteCartError = {
	message?: string;
	name?: string;
	type?: string;
	code?: string;
};

/** Wynik finalizacji koszyka — zamówienie albo koszyk z błędem. */
export type CompleteCartResponse =
	| { type: "order"; order: { id: string; display_id?: number } }
	| { type: "cart"; cart: Cart; error?: CompleteCartError };
