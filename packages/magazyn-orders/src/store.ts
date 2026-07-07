import "server-only";
import { adminFetch, serviceAdminFetch } from "@moduly/magazyn-core";
import { getSessionToken } from "@moduly/magazyn-core";
import { resolveMedusaMediaUrl } from "@moduly/magazyn-core";
import { thumbnailFromMedusaProduct, resolveLineItemThumbnail } from "./lib/product-thumbnail";
import {
	EXPRESS_FEE_SHIPPING_METHOD_NAME,
	formatPrice,
	toMinorUnitsFromDecimal,
} from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { formatLineItemDetailsLines } from "./lib/format-line-item-for-email";
import { expressFeeMinor, isExpressDelivery } from "./order-express";
import type {
	AdminOrderDetail,
	AdminOrderRow,
	AdminOrdersOverviewSummary,
	OrderAddress,
	OrderFulfillment,
	OrderFulfillmentStatus,
	OrderPayment,
	OrderPaymentStatus,
	OrderStatus,
} from "./order-types";

export type {
	AdminOrderDetail,
	AdminOrderRow,
	AdminOrdersOverviewSummary,
	OrderAddress,
	OrderFulfillment,
	OrderFulfillmentStatus,
	OrderLineItem,
	OrderPayment,
	OrderPaymentStatus,
	OrderStatus,
} from "./order-types";

type MedusaAddress = {
	first_name?: string | null;
	last_name?: string | null;
	company?: string | null;
	address_1?: string | null;
	address_2?: string | null;
	city?: string | null;
	postal_code?: string | null;
	province?: string | null;
	country_code?: string | null;
	phone?: string | null;
};

type MedusaOrderItem = {
	id: string;
	title?: string | null;
	subtitle?: string | null;
	product_title?: string | null;
	variant_title?: string | null;
	product_id?: string | null;
	quantity?: number | null;
	unit_price?: number | null;
	total?: number | null;
	thumbnail?: string | null;
	metadata?: Record<string, unknown> | null;
};

type MedusaPayment = {
	id: string;
	amount?: number | null;
	currency_code?: string | null;
	provider_id?: string | null;
	captured_at?: string | null;
	canceled_at?: string | null;
};

type MedusaFulfillment = {
	id: string;
	shipped_at?: string | null;
	delivered_at?: string | null;
	canceled_at?: string | null;
	items?: Array<{ id?: string | null; line_item_id?: string | null; quantity?: number | null }> | null;
};

type MedusaShippingMethod = {
	name?: string | null;
	shipping_option_id?: string | null;
	amount?: number | null;
	subtotal?: number | null;
	total?: number | null;
	raw_amount?: { value?: string | number } | number | null;
};

type MedusaOrder = {
	id: string;
	display_id?: number | null;
	status?: OrderStatus | null;
	payment_status?: OrderPaymentStatus | null;
	fulfillment_status?: OrderFulfillmentStatus | null;
	email?: string | null;
	currency_code?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	total?: number | null;
	item_total?: number | null;
	shipping_total?: number | null;
	tax_total?: number | null;
	discount_total?: number | null;
	metadata?: Record<string, unknown> | null;
	items?: MedusaOrderItem[] | null;
	shipping_address?: MedusaAddress | null;
	billing_address?: MedusaAddress | null;
	shipping_methods?: MedusaShippingMethod[] | null;
	payment_collections?: Array<{ payments?: MedusaPayment[] | null }> | null;
	fulfillments?: MedusaFulfillment[] | null;
};

function mapAddress(address: MedusaAddress | null | undefined): OrderAddress | null {
	if (!address) return null;
	const hasData = address.first_name || address.last_name || address.address_1 || address.city || address.phone;
	if (!hasData) return null;
	return {
		firstName: address.first_name ?? "",
		lastName: address.last_name ?? "",
		company: address.company ?? "",
		address1: address.address_1 ?? "",
		address2: address.address_2 ?? "",
		city: address.city ?? "",
		postalCode: address.postal_code ?? "",
		province: address.province ?? "",
		countryCode: address.country_code ?? "",
		phone: address.phone ?? "",
	};
}

function customerNameFrom(order: MedusaOrder): string {
	const address = order.shipping_address ?? order.billing_address;
	return [address?.first_name, address?.last_name].filter(Boolean).join(" ").trim();
}

function normalizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(metadata ?? {})) {
		if (value == null) continue;
		result[key] = typeof value === "string" ? value : JSON.stringify(value);
	}
	return result;
}

/**
 * Medusa v2 zwraca kwoty jako decimal PLN — konwersja na grosze (integer).
 */
function toMinorUnits(amount: number | null | undefined): number {
	return toMinorUnitsFromDecimal(amount);
}

function amountFromUnknown(v: unknown): number {
	if (v === null || v === undefined) return 0;
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	if (typeof v === "object" && v !== null && "value" in v) {
		return amountFromUnknown((v).value);
	}
	return 0;
}

/**
 * `shipping_total` bywa 0 mimo przypiętej metody dostawy — wtedy bierzemy
 * kwotę z `shipping_methods` albo różnicę total − produkty.
 */
function resolveShippingTotal(order: MedusaOrder): number {
	const header = amountFromUnknown(order.shipping_total);
	if (header > 0) return toMinorUnits(header);

	const fromMethods = (order.shipping_methods ?? []).reduce((sum, method) => {
		const raw =
			method.amount ??
			method.total ??
			method.subtotal ??
			method.raw_amount;
		return sum + amountFromUnknown(raw);
	}, 0);
	if (fromMethods > 0) return toMinorUnits(fromMethods);

	if ((order.shipping_methods?.length ?? 0) > 0) {
		const total = amountFromUnknown(order.total);
		const itemTotal = amountFromUnknown(order.item_total);
		const tax = amountFromUnknown(order.tax_total);
		const discount = amountFromUnknown(order.discount_total);
		const derived = total - itemTotal - tax + discount;
		if (derived > 0) return toMinorUnits(derived);
	}

	return 0;
}

/**
 * Wiersz „Dostawa" w szczegółach zamówienia: SUROWA cena kuriera, bez
 * metody-dopłaty express i PRZED rabatami promocji.
 *
 * Parytet z produkcją (bug 06.07.2026): `shipping_total` jest PO
 * adjustmentach i ZAWIERA metodę-dopłatę — przy kodzie darmowej dostawy
 * pokazywało 2,50 (0 za kuriera + dopłata express), sugerując że dopłata
 * objęła dostawę. Konwencja: wiersze przed rabatem + osobny „Rabat".
 */
function resolveCourierShippingGrossMinor(order: MedusaOrder): number {
	const methods = order.shipping_methods ?? [];
	const courierMethods = methods.filter(
		(method) =>
			((method.name ?? "").trim() || "") !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
	);
	if (courierMethods.length > 0) {
		const gross = courierMethods.reduce((sum, method) => {
			const raw =
				method.amount ?? method.subtotal ?? method.raw_amount ?? method.total;
			return sum + amountFromUnknown(raw);
		}, 0);
		return toMinorUnits(gross);
	}
	return resolveShippingTotal(order);
}

/**
 * Część rabatu przypadająca na DOSTAWĘ: surowa cena kuriera − kurier PO
 * adjustmentach (shipping_methods.total). Kod darmowej dostawy → pełna cena
 * kuriera; UI pokazuje wtedy „Dostawa: gratis" zamiast wiersza rabatu.
 */
function resolveShippingDiscountMinor(order: MedusaOrder): number {
	const methods = order.shipping_methods ?? [];
	const courierMethods = methods.filter(
		(method) =>
			((method.name ?? "").trim() || "") !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
	);
	if (courierMethods.length === 0) return 0;
	const gross = courierMethods.reduce((sum, method) => {
		const raw =
			method.amount ?? method.subtotal ?? method.raw_amount ?? method.total;
		return sum + amountFromUnknown(raw);
	}, 0);
	const net = courierMethods.reduce(
		(sum, method) => sum + amountFromUnknown(method.total),
		0,
	);
	return Math.max(0, toMinorUnits(gross) - toMinorUnits(net));
}

const LIST_FIELDS = [
	"id",
	"display_id",
	"status",
	"payment_status",
	"fulfillment_status",
	"email",
	"currency_code",
	"total",
	"created_at",
	"metadata",
	"items.quantity",
	"shipping_address.first_name",
	"shipping_address.last_name",
	"billing_address.first_name",
	"billing_address.last_name",
].join(",");

const DETAIL_FIELDS = [
	"id",
	"display_id",
	"status",
	"payment_status",
	"fulfillment_status",
	"email",
	"currency_code",
	"created_at",
	"updated_at",
	"total",
	"item_total",
	"shipping_total",
	"tax_total",
	"discount_total",
	"metadata",
	"*items",
	"items.thumbnail",
	"items.product_id",
	"items.metadata",
	"*shipping_address",
	"*billing_address",
	"shipping_methods.name",
	"shipping_methods.shipping_option_id",
	"shipping_methods.amount",
	"shipping_methods.subtotal",
	"shipping_methods.total",
	"*payment_collections.payments",
	"payment_collections.payments.provider_id",
	"*fulfillments",
	"fulfillments.items.id",
	"fulfillments.items.quantity",
	"fulfillments.items.line_item_id",
].join(",");

const SUMMARY_LIST_FIELDS = ["id", "status", "payment_status", "total", "currency_code"].join(",");

const SUMMARY_PAGE_SIZE = 100;

/** Zamówienia widoczne w Magazynie — bez archiwizowanych, anulowanych i szkiców. */
const MAGAZYN_VISIBLE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
	"pending",
	"completed",
	"requires_action",
]);

function isMagazynVisibleOrder(status: OrderStatus | string): boolean {
	return MAGAZYN_VISIBLE_ORDER_STATUSES.has(status as OrderStatus);
}

function isPaidPaymentStatus(status: OrderPaymentStatus): boolean {
	return (
		status === "captured" ||
		status === "partially_captured" ||
		status === "authorized" ||
		status === "partially_authorized"
	);
}

export async function getAdminOrdersOverviewSummary(): Promise<AdminOrdersOverviewSummary> {
	const summary: AdminOrdersOverviewSummary = {
		orderCount: 0,
		totalMinor: 0,
		paidCount: 0,
		paidTotalMinor: 0,
		unpaidCount: 0,
		unpaidTotalMinor: 0,
		canceledCount: 0,
		currencyCode: getModulyConfig().commerce.currency.toUpperCase(),
	};

	let offset = 0;
	let total = Infinity;

	while (offset < total) {
		const data = await adminFetch<{ orders: MedusaOrder[]; count: number }>(
			`/admin/orders?limit=${SUMMARY_PAGE_SIZE}&offset=${offset}&order=-created_at&fields=${SUMMARY_LIST_FIELDS}`,
		);

		total = data.count ?? 0;

		for (const order of data.orders ?? []) {
			const status = order.status ?? "pending";
			if (!isMagazynVisibleOrder(status)) continue;

			const paymentStatus = order.payment_status ?? "not_paid";
			const totalMinor = toMinorUnits(order.total);

			summary.orderCount += 1;
			summary.totalMinor += totalMinor;

			if (isPaidPaymentStatus(paymentStatus)) {
				summary.paidCount += 1;
				summary.paidTotalMinor += totalMinor;
			} else {
				summary.unpaidCount += 1;
				summary.unpaidTotalMinor += totalMinor;
			}
		}

		offset += data.orders?.length ?? 0;
		if ((data.orders?.length ?? 0) === 0) break;
	}

	return summary;
}

export async function listAdminOrders(): Promise<AdminOrderRow[]> {
	const data = await adminFetch<{ orders: MedusaOrder[] }>(
		`/admin/orders?limit=100&order=-created_at&fields=${LIST_FIELDS}`,
	);

	return data.orders
		.filter((order) => isMagazynVisibleOrder(order.status ?? "pending"))
		.map((order) => {
			const metadata = normalizeMetadata(order.metadata);
			return {
				id: order.id,
				displayId: order.display_id ?? 0,
				status: order.status ?? "pending",
				paymentStatus: order.payment_status ?? "not_paid",
				fulfillmentStatus: order.fulfillment_status ?? "not_fulfilled",
				email: order.email ?? "",
				customerName: customerNameFrom(order),
				currencyCode: (order.currency_code ?? "pln").toUpperCase(),
				total: toMinorUnits(order.total),
				itemCount: (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
				createdAt: order.created_at ?? "",
				expressDelivery: isExpressDelivery(metadata),
			};
		});
}

function mapMedusaOrderToDetail(
	order: MedusaOrder,
	productThumbnails: Map<string, string | null>,
): AdminOrderDetail {
	const payments: OrderPayment[] = (order.payment_collections ?? []).flatMap((collection) =>
		(collection.payments ?? []).map((payment) => ({
			id: payment.id,
			amount: toMinorUnits(payment.amount),
			currencyCode: (payment.currency_code ?? order.currency_code ?? "pln").toUpperCase(),
			providerId: payment.provider_id ?? null,
			capturedAt: payment.captured_at ?? null,
			canceledAt: payment.canceled_at ?? null,
		})),
	);

	const fulfillments: OrderFulfillment[] = (order.fulfillments ?? []).map((fulfillment) => ({
		id: fulfillment.id,
		shippedAt: fulfillment.shipped_at ?? null,
		deliveredAt: fulfillment.delivered_at ?? null,
		canceledAt: fulfillment.canceled_at ?? null,
		items: (fulfillment.items ?? []).map((item) => ({
			id: item.id ?? item.line_item_id ?? "",
			quantity: item.quantity ?? 0,
		})),
	}));

	return {
		id: order.id,
		displayId: order.display_id ?? 0,
		status: order.status ?? "pending",
		paymentStatus: order.payment_status ?? "not_paid",
		fulfillmentStatus: order.fulfillment_status ?? "not_fulfilled",
		email: order.email ?? "",
		phone: order.shipping_address?.phone ?? order.billing_address?.phone ?? "",
		currencyCode: (order.currency_code ?? "pln").toUpperCase(),
		createdAt: order.created_at ?? "",
		updatedAt: order.updated_at ?? "",
		items: (order.items ?? []).map((item) => ({
			id: item.id,
			title: [item.title ?? item.product_title ?? "Produkt", item.variant_title?.trim()]
				.filter(Boolean)
				.join(" — "),
			quantity: item.quantity ?? 0,
			unitPrice: toMinorUnits(item.unit_price),
			total: toMinorUnits(item.total),
			thumbnail: resolveLineItemThumbnail(
				item.thumbnail,
				item.product_id ? productThumbnails.get(item.product_id) : null,
			),
			metadata: normalizeMetadata(item.metadata),
		})),
		itemTotal: toMinorUnits(order.item_total),
		// Wiersz „Dostawa": surowa cena kuriera bez metody-dopłaty express i
		// przed rabatami (parytet z produkcją, bug 06.07.2026).
		shippingTotal: resolveCourierShippingGrossMinor(order),
		shippingDiscount: resolveShippingDiscountMinor(order),
		taxTotal: toMinorUnits(order.tax_total),
		discountTotal: toMinorUnits(order.discount_total),
		total: toMinorUnits(order.total),
		shippingAddress: mapAddress(order.shipping_address),
		billingAddress: mapAddress(order.billing_address),
		shippingMethodName: order.shipping_methods?.[0]?.name ?? null,
		payments,
		fulfillments,
		metadata: normalizeMetadata(order.metadata),
	};
}

async function loadProductThumbnailsForOrderItems(items: MedusaOrderItem[]): Promise<Map<string, string | null>> {
	const productIds = [
		...new Set(
			items
				.filter((item) => !resolveMedusaMediaUrl(item.thumbnail) && item.product_id)
				.map((item) => item.product_id as string),
		),
	];

	const map = new Map<string, string | null>();
	if (productIds.length === 0) return map;

	await Promise.all(
		productIds.map(async (productId) => {
			try {
				const data = await adminFetch<{
					product: { thumbnail?: string | null; images?: Array<{ url?: string | null }> | null };
				}>(`/admin/products/${productId}?fields=id,thumbnail,images.url`);
				map.set(productId, thumbnailFromMedusaProduct(data.product));
			} catch {
				map.set(productId, null);
			}
		}),
	);

	return map;
}

async function mapMedusaOrderToDetailResolved(order: MedusaOrder): Promise<AdminOrderDetail> {
	const productThumbnails = await loadProductThumbnailsForOrderItems(order.items ?? []);
	return mapMedusaOrderToDetail(order, productThumbnails);
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
	const data = await adminFetch<{ order: MedusaOrder }>(`/admin/orders/${id}?fields=${DETAIL_FIELDS}`);
	if (!data.order) return null;
	return mapMedusaOrderToDetailResolved(data.order);
}

/** Pobiera zamówienie do maili — sesja panelu lub konto serwisowe (MEDUSA_ADMIN_*). */
export async function getAdminOrderForEmail(id: string): Promise<AdminOrderDetail | null> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const token = await getSessionToken();
		if (token) {
			try {
				const order = await getAdminOrder(id);
				if (order) return order;
			} catch {
				// fallback na konto serwisowe
			}
		}

		const data = await serviceAdminFetch<{ order: MedusaOrder }>(`/admin/orders/${id}?fields=${DETAIL_FIELDS}`);
		if (data?.order) return mapMedusaOrderToDetailResolved(data.order);

		if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
	}
	return null;
}

/** Mapuje szczegóły zamówienia na kontekst maila (moduł emails → OrderRenderSource). */
export function orderToEmailSource(order: AdminOrderDetail) {
	const addr = order.shippingAddress;
	const customerName =
		(addr ? [addr.firstName, addr.lastName].filter(Boolean).join(" ") : "").trim() ||
		order.email.split("@")[0] ||
		"Kliencie";
	const address = addr
		? [
				[addr.address1, addr.address2].filter(Boolean).join(" "),
				[addr.postalCode, addr.city].filter(Boolean).join(" "),
			]
				.filter(Boolean)
				.join(", ")
		: "";

	const express = isExpressDelivery(order.metadata);

	return {
		displayId: order.displayId,
		email: order.email,
		phone: order.phone,
		currencyCode: order.currencyCode,
		total: order.total,
		itemTotal: order.itemTotal,
		shippingTotal: order.shippingTotal,
		shippingMethodName: order.shippingMethodName,
		customerName,
		address,
		expressDelivery: express,
		expressFeeMinor: expressFeeMinor(order.metadata, order.itemTotal),
		orderNotes: order.metadata.order_notes,
		orderMetadata: order.metadata,
		createdAt: order.createdAt,
		items: order.items.map((item) => ({
			title: item.title,
			quantity: item.quantity,
			total: formatPrice(item.total, { currency: order.currencyCode }),
			thumbnail: item.thumbnail,
			detailsLines: formatLineItemDetailsLines(item.metadata),
		})),
	};
}

/* ── Mutacje ─────────────────────────────────────────── */

/** Zaksięgowanie płatności (jeśli trzeba) + rozpoczęcie realizacji (fulfillment). */
export async function startOrderRealization(orderId: string): Promise<void> {
	const order = await getAdminOrder(orderId);
	if (!order) throw new Error("Nie znaleziono zamówienia.");

	const pending = order.payments.find((p) => !p.capturedAt && !p.canceledAt && p.amount > 0);
	if (pending) {
		await adminFetch(`/admin/payments/${pending.id}/capture`, { method: "POST", body: JSON.stringify({}) });
	}

	if (["not_fulfilled", "partially_fulfilled"].includes(order.fulfillmentStatus)) {
		await fulfillOrder(orderId);
	}
}

type MedusaOrderRaw = {
	items?: Array<{
		id: string;
		quantity?: number | null;
		detail?: { fulfilled_quantity?: number | null; quantity?: number | null } | null;
	}> | null;
	shipping_methods?: Array<{ shipping_option_id?: string | null }> | null;
};

/** Utworzenie wysyłki (fulfillment) dla wszystkich niezrealizowanych pozycji. */
export async function fulfillOrder(orderId: string): Promise<void> {
	const data = await adminFetch<{ order: MedusaOrderRaw }>(
		`/admin/orders/${orderId}?fields=id,*items,shipping_methods.shipping_option_id`,
	);
	const order = data.order;

	const items = (order.items ?? [])
		.map((item) => {
			const detail = item.detail ?? {};
			const fulfilled = detail.fulfilled_quantity ?? 0;
			const quantity = item.quantity ?? detail.quantity ?? 0;
			const remaining = quantity - fulfilled;
			return { id: item.id, quantity: remaining };
		})
		.filter((item) => item.quantity > 0);

	if (items.length === 0) throw new Error("Wszystkie pozycje są już zrealizowane.");

	const body: Record<string, unknown> = { items };
	const shippingOptionId = order.shipping_methods?.[0]?.shipping_option_id;
	if (shippingOptionId) body.shipping_option_id = shippingOptionId;

	const locations = await adminFetch<{ stock_locations: Array<{ id: string }> }>("/admin/stock-locations?limit=1");
	const locationId = locations.stock_locations[0]?.id;
	if (locationId) body.location_id = locationId;

	await adminFetch(`/admin/orders/${orderId}/fulfillments`, { method: "POST", body: JSON.stringify(body) });
}

type MedusaFulfillmentForShip = {
	id: string;
	shipped_at?: string | null;
	canceled_at?: string | null;
	items?: Array<{ id?: string | null; line_item_id?: string | null; quantity?: number | null }> | null;
};

const SHIPMENT_FIELDS =
	"id,fulfillments.id,fulfillments.shipped_at,fulfillments.canceled_at,fulfillments.items.id,fulfillments.items.line_item_id,fulfillments.items.quantity";

/** Oznaczenie najnowszej wysyłki jako nadanej (shipment). */
export async function markOrderShipped(orderId: string): Promise<void> {
	const fetchFulfillments = () =>
		adminFetch<{ order: { fulfillments?: MedusaFulfillmentForShip[] } }>(
			`/admin/orders/${orderId}?fields=${SHIPMENT_FIELDS}`,
		);

	let data = await fetchFulfillments();
	let fulfillment = (data.order.fulfillments ?? []).filter((f) => !f.canceled_at && !f.shipped_at).at(-1);

	if (!fulfillment) {
		await fulfillOrder(orderId);
		data = await fetchFulfillments();
		fulfillment = (data.order.fulfillments ?? []).filter((f) => !f.canceled_at && !f.shipped_at).at(-1);
		if (!fulfillment) throw new Error("Nie udało się przygotować przesyłki.");
	}

	// Medusa oczekuje ID pozycji zamówienia (ordli_*), nie ID fulfillment item (fulit_*).
	const items = (fulfillment.items ?? [])
		.map((item) => ({ id: item.line_item_id ?? item.id ?? "", quantity: item.quantity ?? 0 }))
		.filter((item) => item.id && item.quantity > 0);

	await adminFetch(`/admin/orders/${orderId}/fulfillments/${fulfillment.id}/shipments`, {
		method: "POST",
		body: JSON.stringify(items.length > 0 ? { items } : {}),
	});
}

/** Oznaczenie wysyłki jako dostarczonej. */
export async function markOrderDelivered(orderId: string): Promise<void> {
	const order = await getAdminOrder(orderId);
	if (!order) throw new Error("Nie znaleziono zamówienia.");

	const fulfillment = order.fulfillments.filter((f) => !f.canceledAt && !f.deliveredAt).at(-1);
	if (!fulfillment) throw new Error("Brak realizacji do oznaczenia jako dostarczona.");

	await adminFetch(`/admin/orders/${orderId}/fulfillments/${fulfillment.id}/mark-as-delivered`, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

/** Anuluje aktywne realizacje — Medusa wymaga tego przed anulowaniem zamówienia. */
async function cancelActiveFulfillments(orderId: string): Promise<void> {
	const data = await adminFetch<{ order: { fulfillments?: MedusaFulfillmentForShip[] } }>(
		`/admin/orders/${orderId}?fields=${SHIPMENT_FIELDS}`,
	);
	const active = (data.order.fulfillments ?? []).filter((f) => !f.canceled_at);
	for (const fulfillment of active) {
		await adminFetch(`/admin/orders/${orderId}/fulfillments/${fulfillment.id}/cancel`, {
			method: "POST",
			body: JSON.stringify({}),
		});
	}
}

export async function cancelOrder(orderId: string): Promise<void> {
	await cancelActiveFulfillments(orderId);
	await adminFetch(`/admin/orders/${orderId}/cancel`, { method: "POST", body: JSON.stringify({ no_notification: false }) });
}

export async function completeOrder(orderId: string): Promise<void> {
	await adminFetch(`/admin/orders/${orderId}/complete`, { method: "POST", body: JSON.stringify({}) });
}

export async function archiveOrder(orderId: string): Promise<void> {
	await adminFetch(`/admin/orders/${orderId}/archive`, { method: "POST", body: JSON.stringify({}) });
}
