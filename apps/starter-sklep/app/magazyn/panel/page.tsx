import {
	OverviewDashboardCharts,
	OverviewKpiSection,
	OverviewRecentOrders,
	fetchAnalyticsDashboard,
	getOverviewSalesPeriod,
	getSalesStatistics,
} from "@moduly/magazyn-analytics";
import { loadAdmin } from "@moduly/magazyn-core";
import { listAdminOrders } from "@moduly/magazyn-orders";
import { modulyConfig } from "@/moduly.config";

export const dynamic = "force-dynamic";

/**
 * Pulpit panelu — REALNE dane (parytet z produkcją Lumine): KPI sprzedaży
 * z Medusy, wykresy, ostatnie zamówienia. Wersja z danymi demo żyje
 * wyłącznie w apps/panel-demo (screenshoty/briefy).
 */
export default async function PanelOverviewPage() {
	const ordersEnabled = modulyConfig.modules.orders === true;

	const dashboardData = ordersEnabled
		? await loadAdmin(async () => {
				const overviewPeriod = getOverviewSalesPeriod();
				// GA4/PostHog przyjmuje zakres w dniach — wyrównaj z okresem sprzedaży.
				const rangeDays = Math.max(
					1,
					Math.ceil(
						(overviewPeriod.rangeEnd.getTime() - overviewPeriod.rangeStart.getTime()) /
							86_400_000,
					),
				);
				const [sales, orders, analytics] = await Promise.all([
					getSalesStatistics(overviewPeriod),
					listAdminOrders(),
					fetchAnalyticsDashboard({ rangeDays }).catch(() => null),
				]);
				return { sales, recentOrders: orders.slice(0, 6), analytics };
			})
		: null;

	return (
		<div className="flex flex-col gap-8">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Przegląd</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Podsumowanie sprzedaży i ostatnie zamówienia.
				</p>
			</header>

			{dashboardData ? (
				<>
					<OverviewKpiSection
						sales={dashboardData.sales}
						analytics={dashboardData.analytics}
					/>
					<OverviewDashboardCharts sales={dashboardData.sales} />
					<OverviewRecentOrders orders={dashboardData.recentOrders} />
				</>
			) : null}
		</div>
	);
}
