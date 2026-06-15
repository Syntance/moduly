import type { MetadataRoute } from "next";

export type RobotsRule = {
	userAgent: string;
	allow?: string | string[];
	disallow?: string | string[];
};

export type BuildRobotsOptions = {
	siteUrl: string;
	rules?: RobotsRule[];
	sitemapPath?: string;
};

function siteOrigin(siteUrl: string): string {
	return siteUrl.trim().replace(/\/$/, "");
}

export function buildRobots({
	siteUrl,
	rules,
	sitemapPath = "/sitemap.xml",
}: BuildRobotsOptions): MetadataRoute.Robots {
	const origin = siteOrigin(siteUrl);
	return {
		rules: rules ?? [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/checkout", "/checkout/potwierdzenie", "/koszyk", "/api/"],
			},
		],
		sitemap: `${origin}${sitemapPath}`,
	};
}

/** Domyślne robots.txt dla startera sklepu. */
export function defaultShopRobots(siteUrl: string): MetadataRoute.Robots {
	return buildRobots({ siteUrl });
}

/** Domyślne robots.txt dla startera strony CMS (bez checkout/koszyk). */
export function defaultCmsRobots(siteUrl: string): MetadataRoute.Robots {
	return buildRobots({
		siteUrl,
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/panel"],
			},
		],
	});
}
