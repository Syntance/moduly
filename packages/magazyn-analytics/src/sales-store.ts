import "server-only";

import { adminFetch } from "@moduly/magazyn-core";
import { toMinorUnitsFromDecimal } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	PRZELEWY24_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
} from "@moduly/magazyn-orders";
import { isMagazynActiveOrder, orderStatusBadge } from "@moduly/magazyn-orders";
import { resolveOrderTotalMinor, resolveShippingTotalMinor } from "@moduly/magazyn-orders";
import type { OrderStatus } from "@moduly/magazyn-orders";
import type {
	DistributionRow,
	MonthlySalesPoint,
	OrderStatusRow,
	SalesStatistics,
	TopProductRow,
} from "./sales-types";
import type { SalesPeriod } from "./sales-period";
import { getOverviewSalesPeriod } from "./sales-period";

const PAGE_SIZE = 100;

const STATUS_COLORS: Record<string, string> = {
	success: "#10b981",
	info: "#0ea5e9",
	warning: "#f59e0b",
	danger: "#ef4444",
	neutral: "#94a3b8",
	refund: "#8b5cf6",
};

const SHIPPING_COLORS = ["#AF7C61", "#725750", "#C9A48D", "#8f7a74", "#b8956a", "#6b5b54"];

type MedusaOrderItem = {
	title?: string | null;
	quantity?: number | null;
	total?: number | null;
};

type MedusaOrder = {
	id: string;
	email?: string | null;
	created_at?: string | null;
	total?: number | null;
	item_total?: number | null;
	shipping_total?: number | null;
	tax_total?: number | null;
	discount_total?: number | null;
	status?: OrderStatus | null;
	shipping_methods?: Array<{
		name?: string | null;
		amount?: number | null;
		subtotal?: number | null;
		total?: number | null;
		raw_amount?: { value?: string | number } | number | null;
	}> | null;
	payment_collections?: Array<{
		payments?: Array<{
			provider_id?: string | null;
			amount?: number | null;
			canceled_at?: string | null;
		}> | null;
	}> | null;
	items?: MedusaOrderItem[] | null;
};

const STATS_FIELDS = [
	"id",
	"email",
	"created_at",
	"total",
	"item_total",
	"shipping_total",
	"tax_total",
	"discount_total",
	"status",
	"items.title",
	"items.quantity",
	"items.total",
	"shipping_methods.name",
	"shipping_methods.amount",
	"shipping_methods.subtotal",
	"shipping_methods.total",
	"payment_collections.payments.provider_id",
	"payment_collections.payments.amount",
	"payment_collections.payments.canceled_at",
].join(",");

function toMinor(amount: number | null | undefined): number {
	return toMinorUnitsFromDecimal(amount);
}

function toPercent(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 1000) / 10;
}

function monthKeyFromDate(iso: string): string {
	const date = new Date(iso);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

function monthLabelFromKey(key: string): string {
	const [year, month] = key.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date.toLocaleDateString(getModulyConfig().commerce.locale, { month: "short" });
}

function buildMonthSlots(rangeStart: Date, rangeEnd: Date): MonthlySalesPoint[] {
	const slots: MonthlySalesPoint[] = [];
	const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
	const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

	while (cursor <= endMonth) {
		const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
		slots.push({
			monthKey,
			month: monthLabelFromKey(monthKey),
			revenueMinor: 0,
			shippingCostMinor: 0,
			orderCount: 0,
		});
		cursor.setMonth(cursor.getMonth() + 1);
	}

	return slots;
}

function paymentProviderLabel(providerId: string | null | undefined): string {
	if (!providerId) return "Nieznana";
	if (providerId === PRZELEWY24_PROVIDER_ID) return "Przelewy24";
	if (providerId === SYSTEM_PAYMENT_PROVIDER_ID) return "Przelew tradycyjny";
	if (providerId.includes("paypo")) return "PayPo";
	if (providerId.includes("blik")) return "BLIK";
	return providerId.replace(/^pp_/, "").replace(/_/g, " ");
}

function primaryPaymentProvider(order: MedusaOrder): string | null {
	for (const collection of order.payment_collections ?? []) {
		for (const payment of collection.payments ?? []) {
			if (payment.canceled_at) continue;
			if (payment.provider_id) return payment.provider_id;
		}
	}
	return null;
}

function pctChange(current: number, previous: number): number | null {
	if (previous <= 0) return current > 0 ? 100 : null;
	return Math.round(((current - previous) / previous) * 1000) / 10;
}

function toDistribution(
	counts: Map<string, number>,
	colors: string[],
): DistributionRow[] {
	const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([name, value], index) => ({
			name,
			value,
			share: toPercent(value, total),
			color: colors[index % colors.length] ?? "#AF7C61",
		}));
}

/** Agreguje statystyki sprzedaży z zamówień Medusa dla wybranego okresu. */
export async function getSalesStatistics(period?: SalesPeriod): Promise<SalesStatistics> {
	const resolved = period ?? getOverviewSalesPeriod();
	const { rangeStart, rangeEnd, rangeLabel, preset } = resolved;

	const monthlyMap = new Map(
		buildMonthSlots(rangeStart, rangeEnd).map((slot) => [slot.monthKey, { ...slot }]),
	);
	const shippingCounts = new Map<string, number>();
	const paymentCounts = new Map<string, number>();
	const statusCounts = new Map<string, { count: number; color: string }>();
	const productMap = new Map<string, TopProductRow>();
	const customers = new Set<string>();

	let offset = 0;
	let total = Infinity;
	let revenueMinor = 0;
	let shippingCostMinor = 0;
	let orderCount = 0;

	while (offset < total) {
		const data = await adminFetch<{ orders: MedusaOrder[]; count: number }>(
			`/admin/orders?limit=${PAGE_SIZE}&offset=${offset}&order=-created_at&fields=${STATS_FIELDS}`,
		);

		total = data.count ?? 0;
		const orders = data.orders ?? [];
		if (orders.length === 0) break;

		for (const order of orders) {
			const createdAt = order.created_at;
			if (!createdAt) continue;

			const created = new Date(createdAt);
			if (created < rangeStart) {
				offset = total;
				break;
			}
			if (created > rangeEnd) continue;

			const status = order.status ?? "pending";
			if (!isMagazynActiveOrder(status)) continue;

			const orderTotal = resolveOrderTotalMinor(order);
			const orderShipping = resolveShippingTotalMinor(order);
			const monthKey = monthKeyFromDate(createdAt);
			const monthSlot = monthlyMap.get(monthKey);
			if (monthSlot) {
				monthSlot.revenueMinor += orderTotal;
				monthSlot.shippingCostMinor += orderShipping;
				monthSlot.orderCount += 1;
			}

			revenueMinor += orderTotal;
			shippingCostMinor += orderShipping;
			orderCount += 1;

			if (order.email) customers.add(order.email.toLowerCase());

			const statusBadge = orderStatusBadge(status);
			const statusEntry = statusCounts.get(statusBadge.label) ?? {
				count: 0,
				color: STATUS_COLORS[statusBadge.tone] ?? "#94a3b8",
			};
			statusEntry.count += 1;
			statusCounts.set(statusBadge.label, statusEntry);

			const shippingName = order.shipping_methods?.[0]?.name?.trim() || "Nie podano";
			shippingCounts.set(shippingName, (shippingCounts.get(shippingName) ?? 0) + 1);

			const paymentLabel = paymentProviderLabel(primaryPaymentProvider(order));
			paymentCounts.set(paymentLabel, (paymentCounts.get(paymentLabel) ?? 0) + 1);

			for (const item of order.items ?? []) {
				const title = item.title?.trim() || "Produkt";
				const quantity = item.quantity ?? 0;
				const itemRevenue = toMinor(item.total);
				const existing = productMap.get(title);
				if (existing) {
					existing.quantity += quantity;
					existing.revenueMinor += itemRevenue;
				} else {
					productMap.set(title, { title, quantity, revenueMinor: itemRevenue });
				}
			}
		}

		offset += orders.length;
	}

	const monthly = [...monthlyMap.values()];
	const currentMonth = monthly.at(-1);
	const previousMonth = monthly.at(-2);

	const statusBreakdown: OrderStatusRow[] = [...statusCounts.entries()]
		.sort((a, b) => b[1].count - a[1].count)
		.map(([label, { count, color }]) => ({
			label,
			count,
			share: toPercent(count, orderCount),
			color,
		}));

	const topProducts = [...productMap.values()]
		.sort((a, b) => b.revenueMinor - a.revenueMinor)
		.slice(0, 5);

	return {
		rangeLabel,
		periodPreset: preset,
		currencyCode: getModulyConfig().commerce.currency.toUpperCase(),
		monthly,
		shippingMethods: toDistribution(shippingCounts, SHIPPING_COLORS),
		paymentMethods: toDistribution(paymentCounts, SHIPPING_COLORS),
		topProducts,
		statusBreakdown,
		totals: {
			revenueMinor,
			shippingCostMinor,
			incomeMinor: revenueMinor - shippingCostMinor,
			orderCount,
			uniqueCustomers: customers.size,
			averageOrderMinor: orderCount > 0 ? Math.round(revenueMinor / orderCount) : 0,
		},
		trends: {
			revenueChangePct: pctChange(
				currentMonth?.revenueMinor ?? 0,
				previousMonth?.revenueMinor ?? 0,
			),
			incomeChangePct: pctChange(
				(currentMonth?.revenueMinor ?? 0) - (currentMonth?.shippingCostMinor ?? 0),
				(previousMonth?.revenueMinor ?? 0) - (previousMonth?.shippingCostMinor ?? 0),
			),
			ordersChangePct: pctChange(currentMonth?.orderCount ?? 0, previousMonth?.orderCount ?? 0),
		},
	};
}
