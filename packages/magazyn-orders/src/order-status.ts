import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "./order-types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "refund";

export type StatusBadge = { label: string; tone: Tone };

const STATUS: Record<OrderStatus, StatusBadge> = {
	pending: { label: "W toku", tone: "info" },
	completed: { label: "Zrealizowane", tone: "success" },
	draft: { label: "Szkic", tone: "neutral" },
	archived: { label: "Zarchiwizowane", tone: "neutral" },
	canceled: { label: "Anulowane", tone: "danger" },
	requires_action: { label: "Wymaga działania", tone: "warning" },
};

const PAYMENT: Record<OrderPaymentStatus, StatusBadge> = {
	not_paid: { label: "Nieopłacone", tone: "warning" },
	awaiting: { label: "Oczekuje", tone: "warning" },
	authorized: { label: "Autoryzowane", tone: "info" },
	partially_authorized: { label: "Częśc. autoryzowane", tone: "info" },
	captured: { label: "Opłacone", tone: "success" },
	partially_captured: { label: "Częśc. opłacone", tone: "info" },
	refunded: { label: "Zwrócone", tone: "neutral" },
	partially_refunded: { label: "Częśc. zwrócone", tone: "neutral" },
	canceled: { label: "Anulowane", tone: "danger" },
	requires_action: { label: "Wymaga działania", tone: "warning" },
};

const FULFILLMENT: Record<OrderFulfillmentStatus, StatusBadge> = {
	not_fulfilled: { label: "Oczekuje na akceptację", tone: "warning" },
	partially_fulfilled: { label: "Częśc. w realizacji", tone: "info" },
	fulfilled: { label: "W toku", tone: "info" },
	partially_shipped: { label: "Częśc. u kuriera", tone: "info" },
	shipped: { label: "U kuriera", tone: "success" },
	partially_delivered: { label: "Częśc. dostarczone", tone: "info" },
	delivered: { label: "Dostarczone", tone: "success" },
	canceled: { label: "Anulowane", tone: "danger" },
};

/** Anulowane zamówienie z już zaksięgowaną / autoryzowaną płatnością — oczekuje zwrotu. */
const PAYMENT_NEEDING_REFUND: OrderPaymentStatus[] = [
	"captured",
	"partially_captured",
	"authorized",
	"partially_authorized",
];

export function orderStatusBadge(status: OrderStatus): StatusBadge {
	return STATUS[status] ?? { label: status, tone: "neutral" };
}

export function paymentStatusBadge(
	status: OrderPaymentStatus,
	orderStatus?: OrderStatus,
): StatusBadge {
	if (orderStatus === "canceled" && PAYMENT_NEEDING_REFUND.includes(status)) {
		return { label: "Do zwrotu", tone: "refund" };
	}
	return PAYMENT[status] ?? { label: status, tone: "neutral" };
}

export function fulfillmentStatusBadge(
	status: OrderFulfillmentStatus,
	orderStatus?: OrderStatus,
): StatusBadge {
	if (orderStatus === "canceled") return { label: "Anulowane", tone: "danger" };
	return FULFILLMENT[status] ?? { label: status, tone: "neutral" };
}

export const BADGE_TONE_CLASS: Record<Tone, string> = {
	neutral: "bg-muted text-muted-foreground",
	info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
	danger: "bg-destructive/10 text-destructive",
	refund: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};
