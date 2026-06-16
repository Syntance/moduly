/** Pozycja w koszyku / transakcji — ceny w najmniejszej jednostce waluty (grosze). */
export type AnalyticsItem = {
	item_id: string;
	item_name: string;
	price: number;
	quantity: number;
	item_category?: string;
};

export type PageViewPayload = {
	page_path?: string;
	page_title?: string;
};

export type SectionViewPayload = {
	section_id: string;
	section_name?: string;
};

export type CtaClickPayload = {
	cta_id: string;
	cta_label?: string;
	location?: string;
};

export type FormStartPayload = {
	form_name: string;
};

export type FormSubmitPayload = {
	form_name: string;
};

export type LeadSubmitPayload = {
	source: string;
	email_domain?: string;
};

export type ContactClickPayload = {
	channel: string;
	location?: string;
};

export type FileDownloadPayload = {
	file_name: string;
	file_extension?: string;
};

export type OutboundClickPayload = {
	url: string;
	link_text?: string;
};

export type ScrollDepthPayload = {
	depth_percent: 25 | 50 | 75 | 90;
};

export type EcommercePayload = {
	currency: string;
	value: number;
	items: AnalyticsItem[];
};

export type ProductViewPayload = EcommercePayload;

export type AddToCartPayload = EcommercePayload;

export type BeginCheckoutPayload = EcommercePayload;

export type PurchasePayload = EcommercePayload & {
	transaction_id: string;
	payment_method?: string;
	shipping_method?: string;
	checkout_duration_seconds?: number;
};

export type EmailSignupPayload = {
	source: string;
};

export type CheckoutStepPayload = {
	step_number: number;
	cart_value: number;
	currency: string;
};

export type CheckoutAbandonPayload = {
	last_step: string;
	cart_value: number;
	currency: string;
	has_email_domain: boolean;
};

export type FormFieldErrorPayload = {
	form_name: string;
	field: string;
	step?: number;
};

/** Mapa payloadów per event — TS wymusza poprawny kształt przy track(). */
export type EventPayloads = {
	page_view: PageViewPayload;
	section_view: SectionViewPayload;
	cta_click: CtaClickPayload;
	form_start: FormStartPayload;
	form_submit: FormSubmitPayload;
	lead_submit: LeadSubmitPayload;
	contact_click: ContactClickPayload;
	file_download: FileDownloadPayload;
	outbound_click: OutboundClickPayload;
	scroll_depth: ScrollDepthPayload;
	product_view: ProductViewPayload;
	add_to_cart: AddToCartPayload;
	begin_checkout: BeginCheckoutPayload;
	purchase: PurchasePayload;
	email_signup: EmailSignupPayload;
	checkout_step: CheckoutStepPayload;
	checkout_abandon: CheckoutAbandonPayload;
	form_field_error: FormFieldErrorPayload;
};

export type EventKey = keyof EventPayloads;
