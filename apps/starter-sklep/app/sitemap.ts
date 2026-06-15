import type { MetadataRoute } from "next";
import { medusa } from "@moduly/commerce";
import {
	buildSitemap,
	defaultShopStaticSitemapEntries,
	type SitemapEntry,
} from "@moduly/seo-geo";
import { getSiteUrl } from "@/lib/site-url";

const PRODUCTS_PAGE_SIZE = 200;
const MAX_PRODUCT_PAGES = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const dynamicPages = await collectProductPages();

	return buildSitemap({
		siteUrl: getSiteUrl(),
		staticPages: defaultShopStaticSitemapEntries(),
		dynamicPages,
	});
}

async function collectProductPages(): Promise<SitemapEntry[]> {
	const pages: SitemapEntry[] = [];
	const seen = new Set<string>();

	try {
		for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
			const offset = page * PRODUCTS_PAGE_SIZE;
			const { products, count } = await medusa.store.product.list({
				limit: PRODUCTS_PAGE_SIZE,
				offset,
			});

			for (const product of products) {
				if (!product.handle || seen.has(product.handle)) continue;
				seen.add(product.handle);
				pages.push({
					path: `/sklep/${product.handle}`,
					changeFrequency: "weekly",
					priority: 0.8,
					lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
				});
			}

			const fetched = offset + products.length;
			if (products.length === 0 || (typeof count === "number" && fetched >= count)) {
				break;
			}
		}
	} catch {
		/* Medusa niedostępna podczas builda */
	}

	return pages;
}
