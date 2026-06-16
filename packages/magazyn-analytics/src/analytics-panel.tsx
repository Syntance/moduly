"use client";

import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { CheckCircle2 } from "lucide-react";
import { Badge, Card, Section, StatTile, formatKwota } from "@moduly/ui";
import type { AnalyticsDashboardData, AnalyticsKpi } from "./types";

const CHART_STROKE = "#AF7C61";

const chartTooltipStyle = {
	background: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: 10,
	fontSize: 13,
	color: "var(--foreground)",
} as const;

type SourceTab = "combined" | "ga4" | "posthog";

function pickKpi(data: AnalyticsDashboardData, tab: SourceTab): AnalyticsKpi | null {
	if (tab === "ga4") return data.ga4.kpi ?? null;
	if (tab === "posthog") return data.posthog.kpi ?? null;
	return data.ga4.kpi ?? data.posthog.kpi ?? null;
}

function KpiGrid({ kpi, periodLabel }: { kpi: AnalyticsKpi; periodLabel: string }) {
	return (
		<Section title={`Kluczowe wskaźniki (${periodLabel})`}>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatTile label="Sesje" value={(kpi.sessions ?? 0).toLocaleString("pl-PL")} />
				<StatTile label="Użytkownicy" value={(kpi.users ?? 0).toLocaleString("pl-PL")} />
				<StatTile label="Odsłony" value={(kpi.pageviews ?? 0).toLocaleString("pl-PL")} />
				<StatTile
					label="Konwersja"
					value={kpi.conversionRate != null ? `${kpi.conversionRate}%` : "—"}
					sub={
						kpi.purchases != null
							? `${kpi.purchases.toLocaleString("pl-PL")} zakupów`
							: undefined
					}
				/>
			</div>
			{kpi.revenueMinor != null && kpi.revenueMinor > 0 ? (
				<div className="mt-4">
					<StatTile label="Przychód (zdarzenia purchase)" value={formatKwota(kpi.revenueMinor)} />
				</div>
			) : null}
		</Section>
	);
}

function TrafficChart({
	title,
	points,
}: {
	title: string;
	points: Array<{ label: string; value: number }>;
}) {
	if (points.length === 0) return null;
	return (
		<Card>
			<h2 className="font-serif text-lg text-foreground">{title}</h2>
			<div className="mt-4">
				<ResponsiveContainer width="100%" height={220}>
					<AreaChart data={points} margin={{ left: -20 }}>
						<defs>
							<linearGradient id="analytics-traffic-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={CHART_STROKE} stopOpacity={0.3} />
								<stop offset="95%" stopColor={CHART_STROKE} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip contentStyle={chartTooltipStyle} />
						<Area
							type="monotone"
							dataKey="value"
							stroke={CHART_STROKE}
							strokeWidth={2}
							fill="url(#analytics-traffic-grad)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}

export type AnalyticsPanelProps = {
	data: AnalyticsDashboardData;
	/** Podgląd demo — bez live API. */
	demo?: boolean;
};

export function AnalyticsPanel({ data, demo = false }: AnalyticsPanelProps) {
	const [tab, setTab] = useState<SourceTab>("combined");
	const periodLabel = `ostatnie ${data.rangeDays} dni`;
	const kpi = pickKpi(data, tab);

	const sourceTabs: Array<{ id: SourceTab; label: string }> = [
		{ id: "combined", label: "Łącznie" },
		{ id: "ga4", label: "GA4" },
		{ id: "posthog", label: "PostHog" },
	];

	const trafficPoints = useMemo(() => {
		if (tab === "ga4") return data.ga4.traffic ?? [];
		if (tab === "posthog") return data.posthog.traffic ?? [];
		return data.ga4.traffic ?? data.posthog.traffic ?? [];
	}, [tab, data.ga4.traffic, data.posthog.traffic]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-2">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
						<CheckCircle2 className="size-3.5" aria-hidden />
						{data.ga4.status === "connected" ? data.ga4.label : "GA4"}
					</span>
					<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
						<CheckCircle2 className="size-3.5" aria-hidden />
						{data.posthog.status === "connected" ? data.posthog.label : "PostHog"}
					</span>
					{demo ? <Badge tone="brand">Podgląd demo</Badge> : null}
				</div>
				{demo ? (
					<p className="text-xs text-muted-foreground">Źródła: Google Analytics 4 · PostHog</p>
				) : (
					<p className="text-xs text-muted-foreground">
						Odświeżono:{" "}
						{new Date(data.fetchedAt).toLocaleString("pl-PL", {
							dateStyle: "short",
							timeStyle: "short",
						})}
						{" · "}
						cache 15 min
					</p>
				)}
			</div>

			<div
				className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
				role="tablist"
				aria-label="Źródło analityki"
			>
				{sourceTabs.map(({ id, label }) => (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={tab === id}
						onClick={() => { setTab(id); }}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
							tab === id
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{label}
					</button>
				))}
			</div>

			{kpi ? <KpiGrid kpi={kpi} periodLabel={periodLabel} /> : null}

			<TrafficChart
				title={tab === "posthog" ? "Odsłony (PostHog $pageview)" : "Sesje / ruch"}
				points={trafficPoints.map((p) => ({ label: p.label, value: p.value }))}
			/>

			{(tab === "combined" || tab === "ga4") && data.ga4.channels?.length ? (
				<div className="grid gap-6 lg:grid-cols-2">
					<Card>
						<h2 className="font-serif text-lg text-foreground">Kanały ruchu (GA4)</h2>
						<div className="mt-4">
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={data.ga4.channels} layout="vertical" margin={{ left: 0, right: 16 }}>
									<XAxis type="number" hide />
									<YAxis
										type="category"
										dataKey="channel"
										width={110}
										tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip contentStyle={chartTooltipStyle} />
									<Bar dataKey="sessions" fill={CHART_STROKE} radius={[0, 6, 6, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</Card>

					<Card>
						<h2 className="font-serif text-lg text-foreground">Top strony (GA4)</h2>
						<ol className="mt-4 space-y-2">
							{data.ga4.topPages?.map((page) => (
								<li key={page.path} className="flex items-center justify-between gap-3 text-sm">
									<span className="truncate text-foreground">{page.path}</span>
									<span className="shrink-0 tabular-nums text-muted-foreground">
										{page.views.toLocaleString("pl-PL")} · {page.share}%
									</span>
								</li>
							))}
						</ol>
					</Card>
				</div>
			) : null}

			{(tab === "combined" || tab === "posthog") && data.posthog.funnel?.length ? (
				<Card>
					<div className="mb-4 flex items-center justify-between gap-2">
						<h2 className="font-serif text-lg text-foreground">Lejek e-commerce (PostHog)</h2>
						<Badge tone="brand">product_view → purchase</Badge>
					</div>
					<div className="space-y-3">
						{data.posthog.funnel.map((step) => (
							<div key={step.event}>
								<div className="mb-1 flex justify-between text-sm">
									<span className="text-foreground">{step.label}</span>
									<span className="font-medium tabular-nums text-foreground">
										{step.count.toLocaleString("pl-PL")} · {step.rateFromTop}%
									</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div
										className="h-2 rounded-full bg-primary"
										style={{ width: `${Math.min(step.rateFromTop, 100)}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</Card>
			) : null}

			{(tab === "combined" || tab === "posthog") && data.posthog.topEvents?.length ? (
				<Card>
					<h2 className="font-serif text-lg text-foreground">Top zdarzenia (PostHog)</h2>
					<ul className="mt-4 space-y-2">
						{data.posthog.topEvents.map((row) => (
							<li key={row.event} className="flex justify-between text-sm">
								<span className="font-mono text-foreground">{row.event}</span>
								<span className="tabular-nums text-muted-foreground">
									{row.count.toLocaleString("pl-PL")}
								</span>
							</li>
						))}
					</ul>
				</Card>
			) : null}
		</div>
	);
}
