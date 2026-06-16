import type { EventKey } from "./payloads";

export type Ga4Conversion =
	| "view_item"
	| "add_to_cart"
	| "begin_checkout"
	| "purchase"
	| "sign_up"
	| "generate_lead";

export type MetaEvent =
	| "ViewContent"
	| "AddToCart"
	| "InitiateCheckout"
	| "Purchase"
	| "CompleteRegistration"
	| "Lead"
	| "Contact";

export type EventRegistryEntry = {
	conversion?: Ga4Conversion;
	meta?: MetaEvent;
};

export const EVENT_REGISTRY: Record<EventKey, EventRegistryEntry> = {
	page_view: {},
	section_view: {},
	cta_click: {},
	form_start: {},
	form_submit: {},
	lead_submit: { conversion: "generate_lead", meta: "Lead" },
	contact_click: { meta: "Contact" },
	file_download: {},
	outbound_click: {},
	scroll_depth: {},
	product_view: { conversion: "view_item", meta: "ViewContent" },
	add_to_cart: { conversion: "add_to_cart", meta: "AddToCart" },
	begin_checkout: { conversion: "begin_checkout", meta: "InitiateCheckout" },
	purchase: { conversion: "purchase", meta: "Purchase" },
	email_signup: { conversion: "sign_up", meta: "CompleteRegistration" },
	checkout_step: {},
	checkout_abandon: {},
	form_field_error: {},
};
