import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@moduly/magazyn-core/lib/format";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { SalesStatistics } from "../sales-types";
import type { AnalyticsDashboardData } from "../types";

function TrendHint({ value, suffix }: { value: number | null; suffix: string }) {
	if (value == null) return <p className="mt-1 text-xs text-muted-foreground">{suffix}</p>;
	return (
		<p className="mt-1 text-xs text-muted-foreground">
			<span className={value >= 0 ? "text-emerald-600" : "text-amber-600"}>
				{value >= 0 ? "â†‘" : "â†“"} {Math.abs(value)}%
			</span>{" "}
			{suffix}
		</p>
	);
}

function KpiCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
			<p className="mt-1 font-serif text-2xl tabular-nums text-foreground">{value}</p>
			{hint}
		</div>
	);
}

export function OverviewKpiSection({
	sales,
	analytics,
}: {
	sales: SalesStatistics;
	analytics: AnalyticsDashboardData | null;
}) {
	const currentMonth = sales.monthly.at(-1);
	const analyticsKpi = analytics?.posthog.kpi ?? analytics?.ga4.kpi ?? null;
	const statsHref = `${getModulyConfig().basePath}/panel/statystyki`;

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="font-serif text-lg text-foreground">Podsumowanie ({sales.rangeLabel})</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Dane ze sklepu{analyticsKpi ? " Â· ruch z GA4/PostHog" : ""}.
					</p>
				</div>
				<Link
					href={statsHref}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
				>
					Statystyki
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<KpiCard
					label="PrzychĂłd"
					value={formatPrice(sales.totals.revenueMinor, { currency: sales.currencyCode })}
					hint={<TrendHint value={sales.trends.revenueChangePct} suffix="vs. poprzedni miesiÄ…c" />}
				/>
				<KpiCard
					label="Koszty dostawy"
					value={formatPrice(sales.totals.shippingCostMinor, { currency: sales.currencyCode })}
					hint={
						<p className="mt-1 text-xs text-muted-foreground">
							OpĹ‚aty za dostawÄ™ od klientĂłw
						</p>
					}
				/>
				<KpiCard
					label="DochĂłd"
					value={formatPrice(sales.totals.incomeMinor, { currency: sales.currencyCode })}
					hint={<TrendHint value={sales.trends.incomeChangePct} suffix="vs. poprzedni miesiÄ…c" />}
				/>
				<KpiCard
					label="ZamĂłwienia"
					value={sales.totals.orderCount.toLocaleString("pl-PL")}
					hint={
						<TrendHint value={sales.trends.ordersChangePct} suffix="vs. poprzedni miesiÄ…c" />
					}
				/>
				<KpiCard
					label="Klienci"
					value={sales.totals.uniqueCustomers.toLocaleString("pl-PL")}
					hint={
						<p className="mt-1 text-xs text-muted-foreground">
							Unikalne adresy e-mail w okresie
						</p>
					}
				/>
				<KpiCard
					label="Ĺšr. wartoĹ›Ä‡ koszyka"
					value={formatPrice(sales.totals.averageOrderMinor, { currency: sales.currencyCode })}
					hint={
						currentMonth ? (
							<p className="mt-1 text-xs text-muted-foreground">
								BieĹĽÄ…cy miesiÄ…c: {currentMonth.orderCount} zam.
							</p>
						) : null
					}
				/>
			</div>

			{analyticsKpi ? (
				<div className="grid gap-4 sm:grid-cols-3">
					<KpiCard
						label="Sesje (30 dni)"
						value={(analyticsKpi.sessions ?? 0).toLocaleString("pl-PL")}
					/>
					<KpiCard
						label="Konwersja"
						value={
							analyticsKpi.conversionRate != null ? `${analyticsKpi.conversionRate}%` : "â€”"
						}
					/>
					<KpiCard
						label="Zakupy (event purchase)"
						value={(analyticsKpi.purchases ?? 0).toLocaleString("pl-PL")}
					/>
				</div>
			) : null}
		</section>
	);
}
