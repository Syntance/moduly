import type { AdminOrderDetail } from "./order-types";

/** Pełny id providera Przelewy24 w Medusie. */
export const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";

/** Provider przelewu tradycyjnego (manual). */
export const SYSTEM_PAYMENT_PROVIDER_ID = "pp_system_default";

function activePayments(order: AdminOrderDetail) {
	return order.payments.filter((p) => !p.canceledAt);
}

/** Provider pierwszej aktywnej płatności zamówienia. */
export function primaryPaymentProviderId(order: AdminOrderDetail): string | null {
	const active = activePayments(order);
	return active[0]?.providerId ?? order.payments[0]?.providerId ?? null;
}

/**
 * „Rozpocznij realizację” tylko gdy płatność poszła przez P24 i jest
 * potwierdzona (captured). Przelew tradycyjny — zawsze „Zaksięguj płatność”.
 */
export function isP24PaymentConfirmed(order: AdminOrderDetail): boolean {
	const provider = primaryPaymentProviderId(order);
	if (provider !== PRZELEWY24_PROVIDER_ID) return false;

	const p24Payments = activePayments(order).filter(
		(p) => p.providerId === PRZELEWY24_PROVIDER_ID,
	);

	return (
		order.paymentStatus === "captured" ||
		order.paymentStatus === "partially_captured" ||
		p24Payments.some((p) => p.capturedAt)
	);
}
