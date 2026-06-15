import { resolveMedusaMediaUrl } from "../medusa/media-url";
import { isCmsMediaAssetUrl } from "./cms-media-gate";

/** Assety statyczne storefrontu w `public/` — nie prefiksuj backendem Medusa. */
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

/**
 * Podgląd w panelu Magazyn — pełny URL (R2/CDN), bez media gate storefrontu.
 * Storefront używa `resolveCmsAssetUrl` / overlay; admin musi widzieć upload od razu.
 */
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

	if (!resolved && trimmed) {
		console.warn("[Asset] Nie udało się zresolvować URL:", trimmed.substring(0, 100));
	}

	return resolved ?? undefined;
}

export function isCmsImageUnoptimized(url: string): boolean {
	if (!url) return false;

	const pathname = (url.split("?")[0] ?? "").toLowerCase();

	if (pathname.endsWith(".svg")) return true;

	if (url.startsWith("http")) {
		try {
			const host = new URL(url).hostname;
			if (host === "localhost" || host === "127.0.0.1") return true;
		} catch {
			return true;
		}
		return false;
	}

	if (
		pathname.startsWith("/static/") ||
		pathname.startsWith("/uploads/") ||
		pathname.startsWith("/products/") ||
		pathname.includes("/cms-uploads/")
	) {
		return true;
	}

	return false;
}
