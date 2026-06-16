import { EVENT_REGISTRY, type EventKey } from "@syntance/analytics-events";
import { analyticsConfig } from "../config";
import { itemsToGa4, valueToGa4 } from "../utils/ga4-items";

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

function gtag(...args: unknown[]): void {
	if (typeof window === "undefined" || !window.gtag) return;
	window.gtag(...args);
}

export function sendGa4Event(
	name: EventKey,
	payload: Record<string, unknown>,
): void {
	const entry = EVENT_REGISTRY[name];
	const ga4Name = entry.conversion ?? name;

	const params: Record<string, unknown> = { ...payload };

	if (Array.isArray(payload.items)) {
		params.items = itemsToGa4(payload.items as Parameters<typeof itemsToGa4>[0]);
	}
	if (typeof payload.value === "number") {
		params.value = valueToGa4(payload.value);
	}
	if (typeof payload.cart_value === "number") {
		params.cart_value = valueToGa4(payload.cart_value);
	}

	gtag("event", ga4Name, {
		...params,
		...(entry.conversion && analyticsConfig.ga4Id
			? { send_to: analyticsConfig.ga4Id }
			: {}),
	});
}
