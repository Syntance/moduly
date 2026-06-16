"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { extractEmailDomain } from "@syntance/analytics-events";
import type {
	AddToCartPayload,
	AnalyticsItem,
	BeginCheckoutPayload,
	CheckoutAbandonPayload,
	CheckoutStepPayload,
	ContactClickPayload,
	CtaClickPayload,
	EmailSignupPayload,
	EventKey,
	EventPayloads,
	FileDownloadPayload,
	FormFieldErrorPayload,
	FormStartPayload,
	FormSubmitPayload,
	LeadSubmitPayload,
	OutboundClickPayload,
	PageViewPayload,
	ProductViewPayload,
	PurchasePayload,
	ScrollDepthPayload,
	SectionViewPayload,
} from "@syntance/analytics-events";
import { track } from "./track";

export function useAnalytics() {
	const pathname = usePathname() ?? "/";

	const trackEvent = useCallback(
		<K extends EventKey>(name: K, payload: EventPayloads[K]) => {
			track(name, payload);
		},
		[],
	);

	return useMemo(
		() => ({
			track: trackEvent,
			pageView: (payload: PageViewPayload = {}) => {
				trackEvent("page_view", {
					page_path: pathname,
					...payload,
				});
			},
			sectionView: (payload: SectionViewPayload) => trackEvent("section_view", payload),
			cta: (payload: CtaClickPayload) => trackEvent("cta_click", payload),
			formStart: (payload: FormStartPayload) => trackEvent("form_start", payload),
			formSubmit: (payload: FormSubmitPayload) => trackEvent("form_submit", payload),
			lead: (payload: LeadSubmitPayload) =>
				trackEvent("lead_submit", {
					...payload,
					email_domain: payload.email_domain
						? payload.email_domain
						: undefined,
				}),
			leadFromEmail: (source: string, email?: string) =>
				trackEvent("lead_submit", {
					source,
					email_domain: extractEmailDomain(email),
				}),
			contact: (payload: ContactClickPayload) => trackEvent("contact_click", payload),
			download: (payload: FileDownloadPayload) => trackEvent("file_download", payload),
			outboundClick: (payload: OutboundClickPayload) => trackEvent("outbound_click", payload),
			scrollDepth: (payload: ScrollDepthPayload) => trackEvent("scroll_depth", payload),
			productView: (payload: ProductViewPayload) => trackEvent("product_view", payload),
			addToCart: (payload: AddToCartPayload) => trackEvent("add_to_cart", payload),
			beginCheckout: (payload: BeginCheckoutPayload) => trackEvent("begin_checkout", payload),
			purchase: (payload: PurchasePayload) => trackEvent("purchase", payload),
			emailSignup: (payload: EmailSignupPayload) => trackEvent("email_signup", payload),
			checkoutStep: (payload: CheckoutStepPayload) => trackEvent("checkout_step", payload),
			checkoutAbandon: (payload: CheckoutAbandonPayload) =>
				trackEvent("checkout_abandon", payload),
			formFieldError: (payload: FormFieldErrorPayload) =>
				trackEvent("form_field_error", payload),
			toAnalyticsItems: (
				items: Array<{
					variant_id: string;
					title: string;
					quantity: number;
					unit_price: number;
				}>,
			): AnalyticsItem[] =>
				items.map((item) => ({
					item_id: item.variant_id,
					item_name: item.title,
					price: Math.round(item.unit_price),
					quantity: item.quantity,
				})),
		}),
		[pathname, trackEvent],
	);
}
