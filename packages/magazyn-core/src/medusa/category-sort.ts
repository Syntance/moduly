export const CATEGORY_SORT_METADATA_KEY = "sort_order";

export function parseCategorySortOrder(
	metadata: Record<string, unknown> | null | undefined,
): number {
	const raw = metadata?.[CATEGORY_SORT_METADATA_KEY];
	if (typeof raw === "number" && Number.isFinite(raw)) return raw;
	if (typeof raw === "string") {
		const parsed = Number.parseInt(raw, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return Number.MAX_SAFE_INTEGER;
}

export function categorySortOrderMetadata(sortOrder: number): Record<string, string> {
	return { [CATEGORY_SORT_METADATA_KEY]: String(sortOrder) };
}

export function compareCategoriesBySortOrder(
	a: { metadata?: Record<string, unknown> | null; name: string },
	b: { metadata?: Record<string, unknown> | null; name: string },
): number {
	const diff = parseCategorySortOrder(a.metadata) - parseCategorySortOrder(b.metadata);
	if (diff !== 0) return diff;
	return a.name.localeCompare(b.name, "pl");
}
