import type { MetadataRoute } from "next";

export type SitemapEntry = {
	path: string;
	changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
	priority?: number;
	lastModified?: Date;
};

export type BuildSitemapOptions = {
	siteUrl: string;
	staticPages: SitemapEntry[];
	dynamicPages?: SitemapEntry[];
};

export function buildSitemap({
	siteUrl,
	staticPages,
	dynamicPages = [],
}: BuildSitemapOptions): MetadataRoute.Sitemap {
	const origin = siteUrl.trim().replace(/\/$/, "");
	const now = new Date();

	const toEntry = (page: SitemapEntry): MetadataRoute.Sitemap[number] => ({
		url: `${origin}${page.path.startsWith("/") ? page.path : `/${page.path}`}`,
		lastModified: page.lastModified ?? now,
		changeFrequency: page.changeFrequency ?? "weekly",
		priority: page.priority ?? 0.5,
	});

	return [...staticPages.map(toEntry), ...dynamicPages.map(toEntry)];
}

/** Domyślne strony informacyjne dla startera strony CMS. */
export function defaultCmsStaticSitemapEntries(): SitemapEntry[] {
	const now = new Date();
	return [
		{ path: "/", changeFrequency: "daily", priority: 1.0, lastModified: now },
		{ path: "/kontakt", changeFrequency: "monthly", priority: 0.6, lastModified: now },
		{ path: "/polityka-prywatnosci", changeFrequency: "yearly", priority: 0.3, lastModified: now },
		{ path: "/regulamin", changeFrequency: "yearly", priority: 0.3, lastModified: now },
	];
}

/** Domyślne strony sklepu (PLP + informacyjne). */
export function defaultShopStaticSitemapEntries(): SitemapEntry[] {
	const now = new Date();
	return [
		{ path: "/", changeFrequency: "daily", priority: 1.0, lastModified: now },
		{ path: "/sklep", changeFrequency: "daily", priority: 0.9, lastModified: now },
		{ path: "/kontakt", changeFrequency: "monthly", priority: 0.6, lastModified: now },
		{ path: "/dostawa-i-platnosci", changeFrequency: "monthly", priority: 0.6, lastModified: now },
		{ path: "/zwroty", changeFrequency: "yearly", priority: 0.4, lastModified: now },
		{ path: "/regulamin", changeFrequency: "yearly", priority: 0.3, lastModified: now },
		{ path: "/polityka-prywatnosci", changeFrequency: "yearly", priority: 0.3, lastModified: now },
	];
}
