"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card } from "./chrome";
import {
	dostawyStat,
	formatKwota,
	platnosciStat,
	przychodyMiesieczne,
	topProduktyStat,
} from "./demo-data";

const CHART_STROKE = "#AF7C61";

const chartTooltipStyle = {
	background: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: 10,
	fontSize: 13,
	color: "var(--foreground)",
} as const;

export function StatisticsView() {
	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<h2 className="font-serif text-lg text-foreground">Przychód miesięczny</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
					<div className="mt-4">
						<ResponsiveContainer width="100%" height={200}>
							<AreaChart data={[...przychodyMiesieczne]} margin={{ left: -20 }}>
								<defs>
									<linearGradient id="stats-revenue-grad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor={CHART_STROKE} stopOpacity={0.3} />
										<stop offset="95%" stopColor={CHART_STROKE} stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
								<XAxis
									dataKey="miesiac"
									tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
								/>
								<Tooltip
									contentStyle={chartTooltipStyle}
									formatter={(v) => {
										if (typeof v !== "number") return ["—"];
										return [formatKwota(v * 100)];
									}}
								/>
								<Area
									type="monotone"
									dataKey="przychod"
									stroke={CHART_STROKE}
									strokeWidth={2}
									fill="url(#stats-revenue-grad)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card>
					<h2 className="font-serif text-lg text-foreground">Liczba zamówień</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
					<div className="mt-4">
						<ResponsiveContainer width="100%" height={200}>
							<BarChart data={[...przychodyMiesieczne]} margin={{ left: -20 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
								<XAxis
									dataKey="miesiac"
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
								<Bar dataKey="zamowienia" fill={CHART_STROKE} radius={[6, 6, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card>
					<h2 className="font-serif text-lg text-foreground">Metody dostawy</h2>
					<div className="mt-4">
						<ResponsiveContainer width="100%" height={170}>
							<PieChart>
								<Pie
									data={[...dostawyStat]}
									cx="50%"
									cy="50%"
									innerRadius={50}
									outerRadius={75}
									dataKey="value"
									paddingAngle={2}
								>
									{dostawyStat.map((d, i) => (
										<Cell key={d.name} fill={d.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={chartTooltipStyle}
									formatter={(v) => (typeof v === "number" ? [`${v}%`] : ["—"])}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>
					<ul className="mt-3 space-y-1.5">
						{dostawyStat.map((d) => (
							<li key={d.name} className="flex items-center justify-between text-xs">
								<span className="flex items-center gap-2 text-muted-foreground">
									<span className="inline-block size-2 rounded-full" style={{ background: d.color }} />
									{d.name}
								</span>
								<span className="font-medium text-foreground">{d.value}%</span>
							</li>
						))}
					</ul>
				</Card>

				<Card>
					<h2 className="font-serif text-lg text-foreground">Metody płatności</h2>
					<div className="mt-4">
						<ResponsiveContainer width="100%" height={180}>
							<BarChart data={[...platnosciStat]} layout="vertical" margin={{ left: 0, right: 20 }}>
								<XAxis
									type="number"
									tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(v: number) => `${v}%`}
								/>
								<YAxis
									type="category"
									dataKey="name"
									tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									axisLine={false}
									tickLine={false}
									width={80}
								/>
								<Tooltip
									contentStyle={chartTooltipStyle}
									formatter={(v) => (typeof v === "number" ? [`${v}%`] : ["—"])}
								/>
								<Bar dataKey="value" fill={CHART_STROKE} radius={[0, 6, 6, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card>
					<h2 className="font-serif text-lg text-foreground">Klienci</h2>
					<div className="mt-4 space-y-4">
						{[
							{ label: "Nowi", val: 158, pct: 4.8, color: "bg-sky-500" },
							{ label: "Powracający", val: 3_133, pct: 95.2, color: "bg-emerald-500" },
						].map((k) => (
							<div key={k.label}>
								<div className="mb-1 flex justify-between text-sm">
									<span className="text-foreground">{k.label}</span>
									<span className="font-medium text-foreground">
										{k.val.toLocaleString("pl-PL")} ({k.pct}%)
									</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div className={`h-2 rounded-full ${k.color}`} style={{ width: `${k.pct}%` }} />
								</div>
							</div>
						))}
					</div>
					<dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Śr. LTV</dt>
							<dd className="font-medium text-foreground">{formatKwota(390_800)}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Śr. liczba zamówień</dt>
							<dd className="font-medium text-foreground">2.4</dd>
						</div>
					</dl>
				</Card>
			</div>

			<Card>
				<h2 className="font-serif text-lg text-foreground">Top 5 produktów</h2>
				<ol className="mt-4 space-y-3">
					{topProduktyStat.map((p, i) => (
						<li key={p.nazwa} className="flex items-center gap-4">
							<span className="w-5 shrink-0 text-center font-serif text-base text-muted-foreground">
								{i + 1}
							</span>
							<div className="flex-1">
								<div className="mb-1 flex justify-between">
									<span className="text-sm font-medium text-foreground">{p.nazwa}</span>
									<span className="text-sm font-medium text-foreground">{formatKwota(p.przychod)}</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="h-1.5 flex-1 rounded-full bg-muted">
										<div
											className="h-1.5 rounded-full bg-primary"
											style={{ width: `${(p.sprzedane / topProduktyStat[0].sprzedane) * 100}%` }}
										/>
									</div>
									<span className="shrink-0 text-xs text-muted-foreground">{p.sprzedane} szt.</span>
								</div>
							</div>
						</li>
					))}
				</ol>
			</Card>
		</div>
	);
}
