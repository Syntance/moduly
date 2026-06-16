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
import { Badge, Card } from "./chrome";
import { formatKwota, przychodyMiesieczne, zamowieniaWgStatusu } from "./demo-data";

const CHART_STROKE = "#AF7C61";

const chartTooltipStyle = {
	background: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: 10,
	fontSize: 13,
	color: "var(--foreground)",
} as const;

export function DashboardCharts() {
	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<Card className="lg:col-span-2">
				<div className="mb-4 flex items-end justify-between gap-3">
					<div>
						<h2 className="font-serif text-lg text-foreground">Przychód miesięczny</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
					</div>
					<Badge tone="brand">+18.4% vs 2025</Badge>
				</div>
				<ResponsiveContainer width="100%" height={220}>
					<AreaChart data={[...przychodyMiesieczne]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
						<defs>
							<linearGradient id="panel-revenue-grad" x1="0" y1="0" x2="0" y2="1">
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
							tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
						/>
						<Tooltip
							contentStyle={chartTooltipStyle}
							formatter={(v) => {
								if (typeof v !== "number") return ["—", "Przychód"];
								return [formatKwota(v * 100), "Przychód"];
							}}
						/>
						<Area
							type="monotone"
							dataKey="przychod"
							stroke={CHART_STROKE}
							strokeWidth={2}
							fill="url(#panel-revenue-grad)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</Card>

			<Card>
				<h2 className="font-serif text-lg text-foreground">Zamówienia wg statusu</h2>
				<div className="mt-4 space-y-3">
					{zamowieniaWgStatusu.map((item) => (
						<div key={item.label}>
							<div className="mb-1 flex justify-between text-sm">
								<span className="text-foreground">{item.label}</span>
								<span className="font-medium text-foreground">{item.val.toLocaleString("pl-PL")}</span>
							</div>
							<div className="h-1.5 rounded-full bg-muted">
								<div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
