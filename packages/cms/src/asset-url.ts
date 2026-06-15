import { resolveMedusaMediaUrl } from "./media-url";
import { isCmsMediaAssetUrl } from "./cms-media-gate";

const STOREFRONT_PUBLIC_PREFIXES = ["/images/", "/icons/"] as const;

export function isStorefrontPublicAssetPath(url: string): boolean {
	if (url.startsWith("/")) {
		return STOREFRONT_PUBLIC_PREFIXES.some((prefix) => url.startsWith(prefix));
	}
	try {
		const pathname = new URL(url).pathname;
		return STOREFRONT_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
	} catch {
		return false;
	}
}

/** Podgląd w panelu — pełny URL (R2/CDN), bez media gate storefrontu. */
export function resolveCmsAdminPreviewUrl(url: string | null | undefined): string | undefined {
	if (!url?.trim()) return undefined;
	const trimmed = url.trim();

	if (isStorefrontPublicAssetPath(trimmed)) {
		const pathOnly = trimmed.startsWith("/") ? trimmed : new URL(trimmed).pathname;
		return pathOnly.split("?")[0] || pathOnly;
	}

	return resolveMedusaMediaUrl(trimmed) ?? trimmed;
}

/**
 * Rozwiązuje URL obrazu na storefront: `/images/…` zostaje lokalnie,
 * nieopublikowane uploady CMS (R2, Medusa) → undefined (media gate).
 */
export function resolveCmsAssetUrl(url: string | null | undefined): string | undefined {
	if (!url?.trim()) return undefined;
	const trimmed = url.trim();

	if (isStorefrontPublicAssetPath(trimmed)) {
		const pathOnly = trimmed.startsWith("/") ? trimmed : new URL(trimmed).pathname;
		return pathOnly.split("?")[0] || pathOnly;
	}

	if (isCmsMediaAssetUrl(trimmed)) {
		return undefined;
	}

	const resolved = resolveMedusaMediaUrl(trimmed);

	if (resolved && isCmsMediaAssetUrl(resolved)) {
		return undefined;
	}

	return resolved ?? undefined;
}
