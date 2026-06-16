import "server-only";

import { analyticsEnv } from "../env";
import type {
	AnalyticsKpi,
	DailyPoint,
	FunnelStep,
	PosthogAnalyticsSlice,
	TopEventRow,
} from "../types";

const FETCH_TIMEOUT_MS = 30_000;

const ECOMMERCE_FUNNEL: Array<{ event: string; label: string }> = [
	{ event: "product_view", label: "Wyświetlenie produktu" },
	{ event: "add_to_cart", label: "Dodanie do koszyka" },
	{ event: "begin_checkout", label: "Rozpoczęcie checkoutu" },
	{ event: "purchase", label: "Zakup" },
];

type PosthogQueryResponse = {
	results?: unknown;
	columns?: string[];
};

async function posthogQuery(body: Record<string, unknown>): Promise<PosthogQueryResponse> {
	const apiKey = analyticsEnv.posthogPersonalApiKey;
	const projectId = analyticsEnv.posthogProjectId;
	if (!apiKey || !projectId) {
		throw new Error("Brak konfiguracji PostHog.");
	}

	const response = await fetch(`${analyticsEnv.posthogHost}/api/projects/${projectId}/query/`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`PostHog API ${response.status}: ${text.slice(0, 240)}`);
	}

	return (await response.json()) as PosthogQueryResponse;
}

function parseHogqlCount(response: PosthogQueryResponse): number {
	const results = response.results;
	if (!Array.isArray(results) || results.length === 0) return 0;
	const row = results[0];
	if (!Array.isArray(row)) return 0;
	const value = row[0];
	if (typeof value === "number") return value;
	if (typeof value === "string") return Number(value) || 0;
	return 0;
}

function parseTrendsSeries(response: PosthogQueryResponse): DailyPoint[] {
	const results = response.results;
	if (!Array.isArray(results) || results.length === 0) return [];
	const result = results[0];
	if (!result || typeof result !== "object") return [];

	const data = (result as { data?: number[]; labels?: string[] }).data;
	const labels = (result as { data?: number[]; labels?: string[] }).labels;
	if (!Array.isArray(data) || !Array.isArray(labels)) return [];

	return labels.map((label, index) => ({
		date: label,
		label: new Date(label).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
		value: data[index] ?? 0,
	}));
}

function buildKpi(metrics: {
	sessions: number;
	users: number;
	pageviews: number;
	purchases: number;
	revenueMinor: number;
}): AnalyticsKpi {
	const conversionRate =
		metrics.sessions > 0
			? Math.round((metrics.purchases / metrics.sessions) * 10000) / 100
			: null;
	return {
		sessions: metrics.sessions,
		users: metrics.users,
		pageviews: metrics.pageviews,
		purchases: metrics.purchases,
		revenueMinor: metrics.revenueMinor,
		conversionRate,
	};
}

export async function fetchPosthogAnalytics(rangeDays: number): Promise<PosthogAnalyticsSlice> {
	if (!analyticsEnv.posthogConfigured) {
		return {
			status: "disconnected",
			reason: "Uzupełnij POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID i opcjonalnie POSTHOG_HOST.",
		};
	}

	try {
		const dateFrom = `-${rangeDays}d`;

		const [trafficResponse, usersResponse, pageviewsResponse, purchasesResponse, revenueResponse, topEventsResponse] =
			await Promise.all([
				posthogQuery({
					query: {
						kind: "TrendsQuery",
						dateRange: { date_from: dateFrom },
						interval: "day",
						series: [
							{
								kind: "EventsNode",
								event: "$pageview",
								name: "$pageview",
								math: "total",
							},
						],
						filterTestAccounts: true,
					},
				}),
				posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT uniq(person_id) AS users FROM events WHERE timestamp >= now() - INTERVAL ${rangeDays} DAY`,
					},
				}),
				posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT count() AS pageviews FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${rangeDays} DAY`,
					},
				}),
				posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT count() AS purchases FROM events WHERE event = 'purchase' AND timestamp >= now() - INTERVAL ${rangeDays} DAY`,
					},
				}),
				posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT sum(toFloat(properties.$value)) AS revenue FROM events WHERE event = 'purchase' AND timestamp >= now() - INTERVAL ${rangeDays} DAY`,
					},
				}),
				posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT event, count() AS c FROM events WHERE timestamp >= now() - INTERVAL ${rangeDays} DAY GROUP BY event ORDER BY c DESC LIMIT 8`,
					},
				}),
			]);

		const funnelCounts = await Promise.all(
			ECOMMERCE_FUNNEL.map(async ({ event }) => {
				const response = await posthogQuery({
					query: {
						kind: "HogQLQuery",
						query: `SELECT count() AS c FROM events WHERE event = '${event}' AND timestamp >= now() - INTERVAL ${rangeDays} DAY`,
					},
				});
				return parseHogqlCount(response);
			}),
		);

		const traffic = parseTrendsSeries(trafficResponse);
		const users = parseHogqlCount(usersResponse);
		const pageviews = parseHogqlCount(pageviewsResponse);
		const purchases = parseHogqlCount(purchasesResponse);
		const revenueRaw = parseHogqlCount(revenueResponse);
		const sessions = traffic.reduce((sum, point) => sum + point.value, 0);

		const topEventRows = topEventsResponse.results ?? [];
		const topEvents: TopEventRow[] = Array.isArray(topEventRows)
			? topEventRows
					.filter((row): row is [string, number] => Array.isArray(row) && row.length >= 2)
					.map(([event, count]) => ({
						event,
						count: typeof count === "number" ? count : Number(count) || 0,
					}))
			: [];

		const topFunnel = funnelCounts[0] ?? 0;
		const funnel: FunnelStep[] = ECOMMERCE_FUNNEL.map(({ event, label }, index) => {
			const count = funnelCounts[index] ?? 0;
			return {
				event,
				label,
				count,
				rateFromTop: topFunnel > 0 ? Math.round((count / topFunnel) * 1000) / 10 : 0,
			};
		});

		return {
			status: "connected",
			label: `PostHog · projekt ${analyticsEnv.posthogProjectId}`,
			kpi: buildKpi({
				sessions,
				users,
				pageviews,
				purchases,
				revenueMinor: Math.round(revenueRaw * 100),
			}),
			traffic,
			funnel,
			topEvents,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Nieznany błąd PostHog";
		return { status: "error", reason: message };
	}
}
