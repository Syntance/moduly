import "server-only";

import type { ReturnRequest } from "@moduly/types";
import { serverEnv, serviceAdminFetch } from "@moduly/magazyn-core";
import { getReturnRequestsByCustomerEmail } from "@moduly/magazyn-returns";
import {
	CLAIM_WARRANTY_DAYS,
	WITHDRAWAL_WINDOW_DAYS,
	daysLeftInWindow,
} from "./order-windows";

export type CustomerOrderItem = {
	id: string;
	title: string;
	quantity: number;
	unitPrice: number;
	thumbnail: string | null;
};

export type CustomerCaseSummary = {
	id: string;
	itemIds: string[];
	status: ReturnRequest["status"];
	referenceId: string | null;
};

export type CustomerOrder = {
	id: string;
	displayId: number;
	email: string;
	createdAt: string;
	total: number;
	items: CustomerOrderItem[];
	claims: CustomerCaseSummary[];
	withdrawals: CustomerCaseSummary[];
	canReturn: boolean;
	canClaim: boolean;
	withdrawalDaysLeft: number;
	claimDaysLeft: number;
};

type MedusaOrder = {
	id: string;
	display_id?: number;
	email?: string;
	created_at?: string;
	total?: number;
	items?: Array<{
		id: string;
		title?: string;
		quantity?: number;
		unit_price?: number;
		thumbnail?: string | null;
	}>;
	fulfillments?: Array<{ delivered_at?: string | null; created_at?: string }>;
};

function mapCaseSummary(row: ReturnRequest): CustomerCaseSummary {
	return {
		id: row.id,
		itemIds: row.items.map((i) => i.orderLineItemId),
		status: row.status,
		referenceId: row.claimReferenceId,
	};
}

function deliveryStart(order: MedusaOrder): string {
	const delivered = order.fulfillments?.find((f) => f.delivered_at)?.delivered_at;
	return delivered ?? order.created_at ?? new Date().toISOString();
}

function mapOrder(row: MedusaOrder, cases: ReturnRequest[]): CustomerOrder {
	const email = row.email ?? "";
	const start = deliveryStart(row);
	const claims = cases
		.filter((c) => c.requestType === "claim" && c.orderId === row.id)
		.map(mapCaseSummary);
	const withdrawals = cases
		.filter((c) => c.requestType === "withdrawal" && c.orderId === row.id)
		.map(mapCaseSummary);
	const withdrawalDaysLeft = daysLeftInWindow(start, WITHDRAWAL_WINDOW_DAYS);
	const claimDaysLeft = daysLeftInWindow(start, CLAIM_WARRANTY_DAYS);

	return {
		id: row.id,
		displayId: row.display_id ?? 0,
		email,
		createdAt: row.created_at ?? new Date().toISOString(),
		total: row.total ?? 0,
		items: (row.items ?? []).map((item) => ({
			id: item.id,
			title: item.title ?? "Produkt",
			quantity: item.quantity ?? 1,
			unitPrice: item.unit_price ?? 0,
			thumbnail: item.thumbnail ?? null,
		})),
		claims,
		withdrawals,
		canReturn: withdrawalDaysLeft > 0,
		canClaim: claimDaysLeft > 0,
		withdrawalDaysLeft,
		claimDaysLeft,
	};
}

export async function getCustomerOrders(email: string): Promise<CustomerOrder[]> {
	const data = await serviceAdminFetch<{ orders: MedusaOrder[] }>(
		`/admin/orders?email=${encodeURIComponent(email)}&limit=50&fields=id,display_id,email,created_at,total,*items,*fulfillments,+fulfillments.delivered_at`,
	);

	if (!data?.orders?.length) return [];

	const cases = await getReturnRequestsByCustomerEmail(email);
	return data.orders.map((order) => mapOrder(order, cases));
}

export async function getCustomerOrderById(
	email: string,
	orderId: string,
): Promise<CustomerOrder | null> {
	const data = await serviceAdminFetch<{ order: MedusaOrder }>(
		`/admin/orders/${orderId}?fields=id,display_id,email,created_at,total,*items,*fulfillments,+fulfillments.delivered_at`,
	);

	const order = data?.order;
	if (!order || (order.email ?? "").toLowerCase() !== email.toLowerCase()) {
		return null;
	}

	const cases = await getReturnRequestsByCustomerEmail(email);
	return mapOrder(order, cases);
}

export function getMedusaBackendUrl(): string {
	return serverEnv.medusaBackendUrl;
}
