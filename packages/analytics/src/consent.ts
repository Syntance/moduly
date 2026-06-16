import { CONSENT_EVENT, type ConsentState } from "@moduly/legal-consent";
import { enabled } from "./config";

export type ConsentCategory = "analytics" | "marketing";

type ConsentSnapshot = {
	analytics: boolean;
	marketing: boolean;
};

let snapshot: ConsentSnapshot = {
	analytics: false,
	marketing: false,
};

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	}
}

function ensureDataLayer(): void {
	if (typeof window === "undefined") return;
	window.dataLayer = window.dataLayer ?? [];
	window.gtag =
		window.gtag ??
		function gtag(...args: unknown[]) {
			window.dataLayer?.push(args);
		};
}

/** Consent Mode v2 — default denied przed pierwszą interakcją. */
export function initConsentMode(): void {
	if (typeof window === "undefined" || !enabled.ga4()) return;
	ensureDataLayer();
	window.gtag?.("consent", "default", {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
		functionality_storage: "granted",
		security_storage: "granted",
		wait_for_update: 500,
	});
}

function applyGtagConsent(state: ConsentSnapshot): void {
	if (typeof window === "undefined" || !enabled.ga4()) return;
	ensureDataLayer();
	window.gtag?.("consent", "update", {
		analytics_storage: state.analytics ? "granted" : "denied",
		ad_storage: state.marketing ? "granted" : "denied",
		ad_user_data: state.marketing ? "granted" : "denied",
		ad_personalization: state.marketing ? "granted" : "denied",
	});
}

export function setConsent(input: ConsentSnapshot): void {
	snapshot = { ...input };
	applyGtagConsent(snapshot);
}

export function syncConsentFromState(state: ConsentState): void {
	setConsent({
		analytics: state.analytics,
		marketing: state.marketing,
	});
}

export function hasConsent(category: ConsentCategory): boolean {
	return snapshot[category];
}

export function subscribeConsentUpdates(onUpdate: (state: ConsentState) => void): () => void {
	if (typeof window === "undefined") return () => undefined;

	const handler = (event: Event) => {
		const detail = (event as CustomEvent<ConsentState>).detail;
		if (detail) onUpdate(detail);
	};

	window.addEventListener(CONSENT_EVENT, handler);
	return () => window.removeEventListener(CONSENT_EVENT, handler);
}
