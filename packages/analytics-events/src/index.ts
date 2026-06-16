export type {
	AnalyticsItem,
	PageViewPayload,
	SectionViewPayload,
	CtaClickPayload,
	FormStartPayload,
	FormSubmitPayload,
	LeadSubmitPayload,
	ContactClickPayload,
	FileDownloadPayload,
	OutboundClickPayload,
	ScrollDepthPayload,
	EcommercePayload,
	ProductViewPayload,
	AddToCartPayload,
	BeginCheckoutPayload,
	PurchasePayload,
	EmailSignupPayload,
	CheckoutStepPayload,
	CheckoutAbandonPayload,
	FormFieldErrorPayload,
	EventPayloads,
	EventKey,
} from "./payloads";

export {
	EVENT_REGISTRY,
	type EventRegistryEntry,
	type Ga4Conversion,
	type MetaEvent,
} from "./registry";

export { extractEmailDomain } from "./email-domain";
