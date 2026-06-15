import { resolveMedusaMediaUrl, resolveMedusaMediaUrls } from "@moduly/magazyn-core";

type MedusaProductMedia = {
	thumbnail?: string | null;
	images?: Array<{ url?: string | null }> | null;
};

export function thumbnailFromMedusaProduct(
	product: MedusaProductMedia | null | undefined,
): string | null {
	if (!product) return null;
	const fromImages = resolveMedusaMediaUrls((product.images ?? []).map((image) => image.url));
	const candidates = [resolveMedusaMediaUrl(product.thumbnail), ...fromImages].filter(
		(url): url is string => Boolean(url),
	);
	return candidates[0] ?? null;
}

export function resolveLineItemThumbnail(
	lineThumbnail: string | null | undefined,
	productThumbnail: string | null | undefined,
): string | null {
	return resolveMedusaMediaUrl(lineThumbnail) ?? productThumbnail ?? null;
}
