export {
	configureMagazynAnalytics,
	getMagazynAnalyticsConfig,
	requireAnalyticsAdmin,
} from "./configure";
export type { MagazynAnalyticsConfig } from "./configure";
export { fetchAnalyticsDashboard } from "./fetch-analytics";
export { AnalyticsPanel, type AnalyticsPanelProps } from "./analytics-panel";
export { StatisticsTabs } from "./statistics-tabs";
export { demoAnalyticsDashboard } from "./demo-analytics-data";
export { analyticsEnv } from "./env";
export type {
	AnalyticsDashboardData,
	AnalyticsKpi,
	AnalyticsSourceState,
	FunnelStep,
	Ga4AnalyticsSlice,
	PosthogAnalyticsSlice,
} from "./types";
export { default as AnalyticsStatisticsPage } from "./page";

/* Realny dashboard Przegladu (parytet z produkcja) - dane sprzedazy z Medusy. */
export { getSalesStatistics } from "./sales-store";
export { getOverviewSalesPeriod, type SalesPeriod } from "./sales-period";
export type { SalesStatistics } from "./sales-types";
export { OverviewKpiSection } from "./overview/overview-kpi-section";
export { OverviewDashboardCharts } from "./overview/overview-dashboard-charts";
export { OverviewRecentOrders } from "./overview/overview-recent-orders";