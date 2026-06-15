import type { Metadata } from "next";
import type { SeoMeta, SiteSettings } from "./types";

export interface BuildMetadataOptions {
	seo?: SeoMeta;
	fallbackTitle: string;
	fallbackDescription?: string;
	fallbackImage?: string;
	siteSettings?: SiteSettings | null;
	/** Bazowy URL witryny (np. https://example.com). */
	siteUrl: string;
	/** Nazwa witryny w Open Graph (domyślnie siteSettings.title). */
	siteName?: string;
	/** Locale Open Graph (domyślnie pl_PL). */
	locale?: string;
	path?: string;
	type?: "website" | "article";
	publishedTime?: string;
}

export function buildMetadata({
	seo,
	fallbackTitle,
	fallbackDescription,
	fallbackImage,
	siteSettings,
	siteUrl,
	siteName,
	locale = "pl_PL",
	path,
	type = "website",
	publishedTime,
}: BuildMetadataOptions): Metadata {
	const origin = siteUrl.trim().replace(/\/$/, "");
	const title = seo?.metaTitle || fallbackTitle;
	const description =
		seo?.metaDescription || fallbackDescription || siteSettings?.description || "";

	const ogTitle = seo?.ogTitle || seo?.metaTitle || fallbackTitle;
	const ogDescription =
		seo?.ogDescription || seo?.metaDescription || fallbackDescription || "";
	const ogImageUrl = seo?.ogImageUrl || fallbackImage || siteSettings?.defaultOgImageUrl;

	const canonical = seo?.canonicalUrl || (path ? `${origin}${path}` : undefined);
	const resolvedSiteName = siteName ?? siteSettings?.title ?? fallbackTitle;

	const robots: Metadata["robots"] = {
		index: !seo?.noIndex,
		follow: !seo?.noFollow,
	};

	return {
		title,
		description,
		alternates: canonical
			? { canonical, languages: { "pl-PL": canonical } }
			: undefined,
		robots,
		openGraph: {
			title: ogTitle,
			description: ogDescription,
			type,
			siteName: resolvedSiteName,
			locale,
			...(canonical ? { url: canonical } : {}),
			...(publishedTime && type === "article" ? { publishedTime } : {}),
			...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } : {}),
		},
		twitter: {
			card: "summary_large_image",
			title: ogTitle,
			description: ogDescription,
			...(ogImageUrl ? { images: [ogImageUrl] } : {}),
		},
	};
}
