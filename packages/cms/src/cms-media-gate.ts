import { resolveMedusaMediaUrl } from "./media-url";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const MEDUSA_MEDIA_PREFIXES = ["/static/", "/uploads/", "/products/"] as const;

/** Zdalny upload CMS (R2/CDN/Medusa) — nie lokalny asset z repo ani `/images/cms/`. */
export function isCmsMediaAssetUrl(value: unknown): boolean {
	if (typeof value !== "string" || !value.trim()) return false;
	const trimmed = value.trim();
	if (trimmed.startsWith("/images/cms/")) return false;
	if (trimmed.startsWith("/images/") || trimmed.startsWith("/icons/")) return false;
	if (trimmed.startsWith("data:")) return false;

	const pathOnly = trimmed.split("?")[0] ?? trimmed;
	if (!IMAGE_EXT.test(pathOnly)) return false;

	if (MEDUSA_MEDIA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return true;
	return /^https?:\/\//i.test(trimmed);
}

/** Gate zawsze włączony — localhost i prod zachowują się identycznie. */
export function isRuntimeCmsMediaGateEnabled(_urlMap?: Readonly<Record<string, string>>): boolean {
	return true;
}

export function lookupPublishedMediaUrl(
	url: string,
	urlMap: Readonly<Record<string, string>>,
): string | undefined {
	if (url.startsWith("/images/cms/")) return url;
	if (urlMap[url]) return urlMap[url];

	const resolved = resolveMedusaMediaUrl(url);
	if (resolved && urlMap[resolved]) return urlMap[resolved];

	return undefined;
}

export function shouldStripUnpublishedCmsMedia(
	url: string,
	urlMap: Readonly<Record<string, string>>,
): boolean {
	if (!isCmsMediaAssetUrl(url)) return false;
	return !lookupPublishedMediaUrl(url, urlMap);
}
