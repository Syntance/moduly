/** Normalizuje URL mediów z Medusa / R2. Względne ścieżki `/static/…` mapuje na CDN. */

function medusaBackendOrigin(): string {
	const url =
		process.env.MEDUSA_BACKEND_URL?.trim() ||
		process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() ||
		"";
	return url.replace(/\/$/, "");
}

export function mediaCdnOrigin(): string | undefined {
	const raw =
		process.env.S3_FILE_URL?.trim() || process.env.NEXT_PUBLIC_S3_FILE_URL?.trim();
	return raw ? raw.replace(/\/$/, "") : undefined;
}

function isMedusaMediaPath(pathWithLeadingSlash: string): boolean {
	return (
		pathWithLeadingSlash.startsWith("/static/") ||
		pathWithLeadingSlash.startsWith("/products/") ||
		pathWithLeadingSlash.startsWith("/uploads/")
	);
}

function rewriteRelativeMediaPathToCdn(pathWithLeadingSlash: string): string | undefined {
	const cdn = mediaCdnOrigin();
	if (!cdn || !isMedusaMediaPath(pathWithLeadingSlash)) return undefined;
	return `${cdn}${pathWithLeadingSlash}`;
}

function rewriteBackendMediaUrlToCdn(absoluteUrl: string): string {
	const cdn = mediaCdnOrigin();
	if (!cdn) return absoluteUrl;

	try {
		const parsed = new URL(absoluteUrl);
		const backend = medusaBackendOrigin();
		if (!backend) return absoluteUrl;

		const backendOrigin = new URL(backend);
		const sameHost =
			parsed.hostname === backendOrigin.hostname &&
			(parsed.port || "") === (backendOrigin.port || "");

		if (sameHost && isMedusaMediaPath(parsed.pathname)) {
			return `${cdn}${parsed.pathname}${parsed.search}`;
		}
	} catch {
		return absoluteUrl;
	}

	return absoluteUrl;
}

export function resolveMedusaMediaUrl(url: string | null | undefined): string | null {
	if (!url?.trim()) return null;

	const trimmed = url.trim();
	const backend = medusaBackendOrigin();

	if (trimmed.startsWith("/")) {
		return rewriteRelativeMediaPathToCdn(trimmed) ?? (backend ? `${backend}${trimmed}` : trimmed);
	}

	try {
		const parsed = new URL(trimmed);
		const isLocalMedusa =
			(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
			(parsed.port === "9000" || parsed.port === "");

		if (isLocalMedusa && backend) {
			const onBackend = `${backend}${parsed.pathname}${parsed.search}`;
			return rewriteBackendMediaUrlToCdn(onBackend);
		}

		return rewriteBackendMediaUrlToCdn(trimmed);
	} catch {
		return trimmed;
	}
}
