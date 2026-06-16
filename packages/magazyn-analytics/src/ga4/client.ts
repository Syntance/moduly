import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { analyticsEnv } from "../env";
import type {
	AnalyticsKpi,
	ChannelRow,
	DailyPoint,
	Ga4AnalyticsSlice,
	TopPageRow,
} from "../types";

const FETCH_TIMEOUT_MS = 30_000;

function dateRange(days: number): { startDate: string; endDate: string } {
	return {
		startDate: `${days}daysAgo`,
		endDate: "today",
	};
}

function formatGa4Date(raw: string): { date: string; label: string } {
	// GA4 zwraca YYYYMMDD
	if (raw.length !== 8) return { date: raw, label: raw };
	const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
	const label = new Date(`${iso}T12:00:00`).toLocaleDateString("pl-PL", {
		day: "numeric",
		month: "short",
	});
	return { date: iso, label };
}

function toPercent(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 1000) / 10;
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

export async function fetchGa4Analytics(rangeDays: number): Promise<Ga4AnalyticsSlice> {
	if (!analyticsEnv.ga4Configured) {
		return {
			status: "disconnected",
			reason: "Uzupełnij GA4_PROPERTY_ID i GA4_SERVICE_ACCOUNT_JSON w .env.",
		};
	}

	const propertyId = analyticsEnv.ga4PropertyId;
	const credentials = analyticsEnv.ga4Credentials;
	if (!propertyId || !credentials) {
		return { status: "disconnected", reason: "Brak konfiguracji GA4." };
	}

	try {
		const client = new BetaAnalyticsDataClient({ credentials });
		const property = `properties/${propertyId}`;
		const range = dateRange(rangeDays);

		const [baseOverviewReport, purchaseReport, trafficReport, channelsReport, pagesReport] =
			await Promise.all([
				client.runReport(
					{
						property,
						dateRanges: [range],
						metrics: [
							{ name: "sessions" },
							{ name: "activeUsers" },
							{ name: "screenPageViews" },
							{ name: "purchaseRevenue" },
						],
					},
					{ timeout: FETCH_TIMEOUT_MS },
				),
				client.runReport(
					{
						property,
						dateRanges: [range],
						metrics: [{ name: "eventCount" }],
						dimensionFilter: {
							filter: {
								fieldName: "eventName",
								stringFilter: { matchType: "EXACT", value: "purchase" },
							},
						},
					},
					{ timeout: FETCH_TIMEOUT_MS },
				),
				client.runReport(
				{
					property,
					dateRanges: [range],
					dimensions: [{ name: "date" }],
					metrics: [{ name: "sessions" }],
					orderBys: [{ dimension: { dimensionName: "date" } }],
				},
				{ timeout: FETCH_TIMEOUT_MS },
			),
			client.runReport(
				{
					property,
					dateRanges: [range],
					dimensions: [{ name: "sessionDefaultChannelGroup" }],
					metrics: [{ name: "sessions" }],
					orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
					limit: 8,
				},
				{ timeout: FETCH_TIMEOUT_MS },
			),
			client.runReport(
				{
					property,
					dateRanges: [range],
					dimensions: [{ name: "pagePath" }],
					metrics: [{ name: "screenPageViews" }],
					orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
					limit: 10,
				},
				{ timeout: FETCH_TIMEOUT_MS },
			),
		]);

		const baseRow = baseOverviewReport[0]?.rows?.[0];
		const purchaseRow = purchaseReport[0]?.rows?.[0];

		const sessions = Number(baseRow?.metricValues?.[0]?.value ?? 0);
		const users = Number(baseRow?.metricValues?.[1]?.value ?? 0);
		const pageviews = Number(baseRow?.metricValues?.[2]?.value ?? 0);
		const revenuePln = Number(baseRow?.metricValues?.[3]?.value ?? 0);
		const purchases = Number(purchaseRow?.metricValues?.[0]?.value ?? 0);

		const traffic: DailyPoint[] =
			trafficReport[0]?.rows?.map((row) => {
				const rawDate = row.dimensionValues?.[0]?.value ?? "";
				const { date, label } = formatGa4Date(rawDate);
				return {
					date,
					label,
					value: Number(row.metricValues?.[0]?.value ?? 0),
				};
			}) ?? [];

		const channelTotal =
			channelsReport[0]?.rows?.reduce(
				(sum, row) => sum + Number(row.metricValues?.[0]?.value ?? 0),
				0,
			) ?? 0;

		const channels: ChannelRow[] =
			channelsReport[0]?.rows?.map((row) => {
				const sessionsCount = Number(row.metricValues?.[0]?.value ?? 0);
				return {
					channel: row.dimensionValues?.[0]?.value ?? "—",
					sessions: sessionsCount,
					share: toPercent(sessionsCount, channelTotal),
				};
			}) ?? [];

		const pageTotal =
			pagesReport[0]?.rows?.reduce(
				(sum, row) => sum + Number(row.metricValues?.[0]?.value ?? 0),
				0,
			) ?? 0;

		const topPages: TopPageRow[] =
			pagesReport[0]?.rows?.map((row) => {
				const views = Number(row.metricValues?.[0]?.value ?? 0);
				return {
					path: row.dimensionValues?.[0]?.value ?? "/",
					views,
					share: toPercent(views, pageTotal),
				};
			}) ?? [];

		return {
			status: "connected",
			label: `GA4 · ${propertyId}`,
			kpi: buildKpi({
				sessions,
				users,
				pageviews,
				purchases,
				revenueMinor: Math.round(revenuePln * 100),
			}),
			traffic,
			channels,
			topPages,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Nieznany błąd GA4";
		return { status: "error", reason: message };
	}
}
