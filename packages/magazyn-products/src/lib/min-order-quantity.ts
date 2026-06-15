export const MIN_ORDER_QUANTITY_META_KEY = "min_order_quantity";

export function parseMinOrderQuantity(
	meta: Record<string, unknown> | null | undefined,
): number {
	const raw = meta?.[MIN_ORDER_QUANTITY_META_KEY];
	if (raw === undefined || raw === null || raw === "") return 1;
	const n = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
	if (!Number.isFinite(n) || n < 1) return 1;
	return Math.min(99, Math.floor(n));
}

export function serializeMinOrderQuantityForMetadata(minOrderQuantity: number): string {
	const clamped = Math.min(99, Math.max(1, Math.floor(minOrderQuantity)));
	return String(clamped);
}
