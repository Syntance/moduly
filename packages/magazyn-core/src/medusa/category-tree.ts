import { compareCategoriesBySortOrder } from "./category-sort";

/**
 * Taksonomia zsynchronizowana z Medusą (`sync-storefront-categories` w backendzie).
 */
export const LISTING_CATEGORY_HANDLE = {
	gotoweWzory: "gotowe-wzory",
	logo3d: "logo-3d",
	certyfikaty: "certyfikaty",
} as const;

export type CategoryTreeNode = {
	id: string;
	handle: string;
	name: string;
	is_active?: boolean;
	metadata?: Record<string, unknown> | null;
	category_children?: CategoryTreeNode[] | null;
};

export type ListingCategoryFilterOption = {
	id: string;
	handle: string;
	name: string;
};

export function buildListingCategoryFilters(
	tree: CategoryTreeNode[],
	listingRootHandle: string,
): ListingCategoryFilterOption[] {
	const root = findCategoryNodeByHandle(tree, listingRootHandle);
	if (!root?.category_children?.length) return [];

	return [...root.category_children]
		.filter((node) => node.is_active !== false)
		.sort(compareCategoriesBySortOrder)
		.map((node) => ({
			id: node.id,
			handle: node.handle,
			name: node.name,
		}));
}

export function flattenCategoryTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
	const out: CategoryTreeNode[] = [];
	for (const n of nodes) {
		out.push(n);
		if (n.category_children?.length) {
			out.push(...flattenCategoryTree(n.category_children));
		}
	}
	return out;
}

export function categoryIdByHandle(
	nodes: CategoryTreeNode[],
	handle: string,
): string | undefined {
	return flattenCategoryTree(nodes).find((c) => c.handle === handle)?.id;
}

export function findCategoryNodeByHandle(
	nodes: CategoryTreeNode[],
	handle: string,
): CategoryTreeNode | null {
	for (const n of nodes) {
		if (n.handle === handle) return n;
		const found = findCategoryNodeByHandle(n.category_children ?? [], handle);
		if (found) return found;
	}
	return null;
}

/** Rooty sekcji sklepu (bez rodzica) — ukryte w magazynie jako filtry. */
export function isShopSectionRoot(category: {
	handle: string;
	parent_category_id?: string | null;
}): boolean {
	if (category.parent_category_id) return false;
	return (
		category.handle === LISTING_CATEGORY_HANDLE.gotoweWzory ||
		category.handle === LISTING_CATEGORY_HANDLE.logo3d
	);
}

export function collectSubtreeCategoryIds(node: CategoryTreeNode): string[] {
	const ids: string[] = [node.id];
	for (const ch of node.category_children ?? []) {
		ids.push(...collectSubtreeCategoryIds(ch));
	}
	return ids;
}
