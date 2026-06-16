"use client";

import { useState } from "react";
import { Badge, StatisticsView } from "@moduly/ui";
import { AnalyticsPanel } from "./analytics-panel";
import { demoAnalyticsDashboard } from "./demo-analytics-data";

type StatisticsTab = "sales" | "analytics";

const TABS: Array<{ id: StatisticsTab; label: string; description: string }> = [
	{
		id: "sales",
		label: "Statystyki sprzedażowe",
		description: "Przychód, zamówienia, dostawa i produkty ze sklepu",
	},
	{
		id: "analytics",
		label: "Analityka",
		description: "Ruch i konwersja z Google Analytics 4 oraz PostHog",
	},
];

export function StatisticsTabs() {
	const [tab, setTab] = useState<StatisticsTab>("sales");
	const activeMeta = TABS.find((item) => item.id === tab) ?? TABS[0]!;

	return (
		<div className="flex flex-col gap-6">
			<div
				className="inline-flex w-fit shrink-0 flex-wrap gap-1 self-start rounded-xl border border-border bg-muted/40 p-1"
				role="tablist"
				aria-label="Sekcje statystyk"
			>
				{TABS.map(({ id, label }) => (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={tab === id}
						onClick={() => { setTab(id); }}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
							tab === id
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<p className="text-sm text-muted-foreground">{activeMeta.description}</p>

			{tab === "sales" ? (
				<StatisticsView />
			) : (
				<AnalyticsPanel data={demoAnalyticsDashboard} demo />
			)}

			<Badge tone="neutral" className="self-start">
				Dane przykładowe · czerwiec 2026
			</Badge>
		</div>
	);
}
