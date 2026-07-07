"use client";

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatChartAxisPrice, formatPrice } from "@moduly/magazyn-core/lib/format";
import type { SalesStatistics } from "../sales-types";

const CHART_STROKE = "oklch(0.58 0.08 55)";

const chartTooltipStyle = {
	background: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: 10,
	fontSize: 13,
	color: "var(--foreground)",
} as const;

export function OverviewDashboardCharts({ sales }: { sales: SalesStatistics }) {
	const chartData = sales.monthly.map((point) => ({
		miesiac: point.month,
		przychodMinor: point.revenueMinor,
	}));

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<article className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
				<div className="mb-4 flex items-end justify-between gap-3">
					<div>
						<h2 className="font-serif text-lg text-foreground">PrzychĂłd miesiÄ™czny</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">{sales.rangeLabel}</p>
					</div>
					{sales.trends.revenueChangePct != null ? (
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
							{sales.trends.revenueChangePct >= 0 ? "+" : ""}
							{sales.trends.revenueChangePct}% vs poprz. mies.
						</span>
					) : null}
				</div>
				<ResponsiveContainer width="100%" height={220}>
					<AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
						<defs>
							<linearGradient id="overview-revenue-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={CHART_STROKE} stopOpacity={0.3} />
								<stop offset="95%" stopColor={CHART_STROKE} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
						<XAxis
							dataKey="miesiac"
							tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
							tickFormatter={(minor: number) =>
								formatChartAxisPrice(minor, { currency: sales.currencyCode })
							}
						/>
						<Tooltip
							contentStyle={chartTooltipStyle}
							formatter={(v) => {
								if (typeof v !== "number") return ["â€”"];
								return [formatPrice(v, { currency: sales.currencyCode }), "PrzychĂłd"];
							}}
						/>
						<Area
							type="monotone"
							dataKey="przychodMinor"
							stroke={CHART_STROKE}
							strokeWidth={2}
							fill="url(#overview-revenue-grad)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</article>

			<article className="rounded-xl border border-border bg-card p-5">
				<h2 className="font-serif text-lg text-foreground">ZamĂłwienia wg statusu</h2>
				<div className="mt-4 space-y-3">
					{sales.statusBreakdown.slice(0, 5).map((item) => (
						<div key={item.label}>
							<div className="mb-1 flex justify-between text-sm">
								<span className="text-foreground">{item.label}</span>
								<span className="font-medium text-foreground">
									{item.count.toLocaleString("pl-PL")}
								</span>
							</div>
							<div className="h-1.5 rounded-full bg-muted">
								<div
									className="h-1.5 rounded-full"
									style={{ width: `${item.share}%`, background: item.color }}
								/>
							</div>
						</div>
					))}
				</div>
			</article>
		</div>
	);
}
