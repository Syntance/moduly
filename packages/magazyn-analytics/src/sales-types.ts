export type MonthlySalesPoint = {
	month: string;
	monthKey: string;
	revenueMinor: number;
	/** Suma opłat za dostawę pobranych od klientów (grosze). */
	shippingCostMinor: number;
	orderCount: number;
};

export type DistributionRow = {
	name: string;
	value: number;
	share: number;
	color: string;
};

export type TopProductRow = {
	title: string;
	quantity: number;
	revenueMinor: number;
};

export type OrderStatusRow = {
	label: string;
	count: number;
	share: number;
	color: string;
};

import type { SalesPeriodPreset } from "./sales-period";

export type SalesStatistics = {
	rangeLabel: string;
	periodPreset: SalesPeriodPreset;
	currencyCode: string;
	monthly: MonthlySalesPoint[];
	shippingMethods: DistributionRow[];
	paymentMethods: DistributionRow[];
	topProducts: TopProductRow[];
	statusBreakdown: OrderStatusRow[];
	totals: {
		revenueMinor: number;
		/** Suma opłat za dostawę od klientów — do odjęcia od przychodu. */
		shippingCostMinor: number;
		/** Przychód minus koszty dostawy (wartość produktów). */
		incomeMinor: number;
		orderCount: number;
		uniqueCustomers: number;
		averageOrderMinor: number;
	};
	/** Bieżący miesiąc vs poprzedni — do KPI na przeglądzie. */
	trends: {
		revenueChangePct: number | null;
		incomeChangePct: number | null;
		ordersChangePct: number | null;
	};
};
