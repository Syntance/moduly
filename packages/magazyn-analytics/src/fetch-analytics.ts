import "server-only";

import { unstable_cache } from "next/cache";
import { analyticsEnv } from "./env";
import { fetchGa4Analytics } from "./ga4/client";
import { fetchPosthogAnalytics } from "./posthog/client";
import type { AnalyticsDashboardData } from "./types";

async function fetchAnalyticsDashboardUncached(
	rangeDays: number,
): Promise<AnalyticsDashboardData> {
	if (!analyticsEnv.panelEnabled) {
		return {
			fetchedAt: new Date().toISOString(),
			rangeDays,
			ga4: { status: "disconnected", reason: "Panel analityki wyłączony (FEATURE_ANALYTICS_PANEL=0)." },
			posthog: { status: "disconnected", reason: "Panel analityki wyłączony (FEATURE_ANALYTICS_PANEL=0)." },
		};
	}

	const [ga4, posthog] = await Promise.all([
		fetchGa4Analytics(rangeDays),
		fetchPosthogAnalytics(rangeDays),
	]);

	return {
		fetchedAt: new Date().toISOString(),
		rangeDays,
		ga4,
		posthog,
	};
}

/** Pobiera dane GA4 + PostHog z cache 15 min (server-only). */
export async function fetchAnalyticsDashboard(options?: {
	rangeDays?: number;
}): Promise<AnalyticsDashboardData> {
	const rangeDays = options?.rangeDays ?? 30;
	const cached = unstable_cache(
		() => fetchAnalyticsDashboardUncached(rangeDays),
		["magazyn-analytics", String(rangeDays)],
		{ revalidate: 900 },
	);
	return cached();
}
