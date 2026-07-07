import { toMinorUnitsFromDecimal } from "@moduly/magazyn-core";
import { EXPRESS_FEE_SHIPPING_METHOD_NAME } from "@moduly/magazyn-core";

export type OrderTotalsInput = {
	total?: number | null;
	item_total?: number | null;
	shipping_total?: number | null;
	tax_total?: number | null;
	discount_total?: number | null;
	shipping_methods?: Array<{
		name?: string | null;
		amount?: number | null;
		subtotal?: number | null;
		total?: number | null;
		raw_amount?: { value?: string | number } | number | null;
	}> | null;
	payment_collections?: Array<{
		payments?: Array<{ amount?: number | null; canceled_at?: string | null }> | null;
	}> | null;
};

function amountFromUnknown(value: unknown): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	if (typeof value === "object" && value !== null && "value" in value) {
		return amountFromUnknown((value as { value: unknown }).value);
	}
	return 0;
}

function toMinor(amount: number | null | undefined): number {
	return toMinorUnitsFromDecimal(amount);
}

/**
 * `shipping_total` bywa 0 mimo przypiętej metody dostawy — wtedy bierzemy
 * kwotę z `shipping_methods` albo różnicę total − produkty.
 */
export function resolveShippingTotalMinor(order: OrderTotalsInput): number {
	const header = amountFromUnknown(order.shipping_total);
	if (header > 0) return toMinor(header);

	const fromMethods = (order.shipping_methods ?? []).reduce((sum, method) => {
		const raw = method.amount ?? method.total ?? method.subtotal ?? method.raw_amount;
		return sum + amountFromUnknown(raw);
	}, 0);
	if (fromMethods > 0) return toMinor(fromMethods);

	if ((order.shipping_methods?.length ?? 0) > 0) {
		const total = amountFromUnknown(order.total);
		const itemTotal = amountFromUnknown(order.item_total);
		const tax = amountFromUnknown(order.tax_total);
		const discount = amountFromUnknown(order.discount_total);
		const derived = total - itemTotal - tax + discount;
		if (derived > 0) return toMinor(derived);
	}

	return 0;
}

/**
 * Wiersz „Dostawa" w szczegółach zamówienia: SUROWA cena kuriera, bez
 * metody-dopłaty express i PRZED rabatami promocji.
 *
 * Bug 06.07.2026: `shipping_total` zamówienia jest PO adjustmentach i
 * ZAWIERA metodę-dopłatę — przy kodzie darmowej dostawy pokazywało 2,50
 * (0 za kuriera + dopłata express), sugerując że dopłata objęła dostawę.
 * Konwencja spójna z checkoutem: wiersze przed rabatem + osobny „Rabat".
 */
export function resolveCourierShippingGrossMinor(order: OrderTotalsInput): number {
	const methods = order.shipping_methods ?? [];
	const courierMethods = methods.filter(
		(method) =>
			((method.name ?? "").trim() || "") !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
	);
	if (courierMethods.length > 0) {
		const gross = courierMethods.reduce((sum, method) => {
			const raw = method.amount ?? method.subtotal ?? method.raw_amount ?? method.total;
			return sum + amountFromUnknown(raw);
		}, 0);
		return toMinor(gross);
	}
	// Brak metod w odpowiedzi — stary fallback (nagłówek / wyliczenie).
	return resolveShippingTotalMinor(order);
}

/**
 * Część rabatu przypadająca na DOSTAWĘ: surowa cena kuriera − kurier PO
 * adjustmentach promocji (shipping_methods.total). Kod darmowej dostawy →
 * pełna cena kuriera; UI pokazuje wtedy „Dostawa: gratis" zamiast wiersza
 * rabatu (spójnie z checkoutem).
 */
export function resolveShippingDiscountMinor(order: OrderTotalsInput): number {
	const methods = order.shipping_methods ?? [];
	const courierMethods = methods.filter(
		(method) =>
			((method.name ?? "").trim() || "") !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
	);
	if (courierMethods.length === 0) return 0;
	const gross = courierMethods.reduce((sum, method) => {
		const raw = method.amount ?? method.subtotal ?? method.raw_amount ?? method.total;
		return sum + amountFromUnknown(raw);
	}, 0);
	const net = courierMethods.reduce(
		(sum, method) => sum + amountFromUnknown(method.total),
		0,
	);
	return Math.max(0, toMinor(gross) - toMinor(net));
}

function resolveCapturedPaymentMinor(order: OrderTotalsInput): number {
	let max = 0;
	for (const collection of order.payment_collections ?? []) {
		for (const payment of collection.payments ?? []) {
			if (payment.canceled_at) continue;
			const amount = toMinor(payment.amount);
			if (amount > max) max = amount;
		}
	}
	return max;
}

/**
 * Kwota zamówienia do statystyk przychodu — z dostawą i zgodna z opłaconą płatnością.
 * Medusa admin czasem zwraca `total` bez kosztu wysyłki (gdy `shipping_total` = 0).
 */
export function resolveOrderTotalMinor(order: OrderTotalsInput): number {
	const apiTotal = toMinor(order.total);
	const captured = resolveCapturedPaymentMinor(order);
	if (captured > 0) return captured;

	const shipping = resolveShippingTotalMinor(order);
	if (shipping <= 0 || apiTotal <= 0) return apiTotal;

	const shippingHeader = toMinor(order.shipping_total);
	if (shippingHeader > 0) return apiTotal;

	const itemTotal = toMinor(order.item_total);
	if (itemTotal > 0 && apiTotal <= itemTotal + 1) {
		return apiTotal + shipping;
	}

	return apiTotal;
}
