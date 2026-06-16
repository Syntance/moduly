import type { PostHog } from "posthog-js";
import { EVENT_REGISTRY, type EventKey } from "@syntance/analytics-events";
import { analyticsConfig, enabled } from "../config";
import { hasConsent } from "../consent";

let client: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

async function getPosthogClient(): Promise<PostHog | null> {
	if (!enabled.posthog() || !hasConsent("analytics")) return null;
	if (client) return client;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const { default: posthog } = await import("posthog-js");
		const key = analyticsConfig.posthogKey;
		if (!key) return null;

		posthog.init(key, {
			api_host: analyticsConfig.posthogHost,
			autocapture: false,
			capture_pageview: false,
			capture_pageleave: false,
			mask_all_text: true,
			opt_out_capturing_by_default: true,
			persistence: "localStorage+cookie",
			loaded: (ph) => {
				ph.opt_out_capturing();
			},
		});

		client = posthog;
		return posthog;
	})();

	return initPromise;
}

export async function ensurePosthogOptIn(): Promise<void> {
	const ph = await getPosthogClient();
	ph?.opt_in_capturing();
}

export async function ensurePosthogOptOut(): Promise<void> {
	client?.opt_out_capturing();
}

export async function sendPosthogEvent(
	name: EventKey,
	payload: Record<string, unknown>,
): Promise<void> {
	if (!enabled.posthog() || !hasConsent("analytics")) return;
	const ph = await getPosthogClient();
	if (!ph) return;

	ph.capture(name, {
		...payload,
		registry_meta: EVENT_REGISTRY[name],
	});
}
