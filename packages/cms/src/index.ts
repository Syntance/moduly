import "server-only";
import { cache } from "react";
import { fetchStoreMetadataBlob } from "./admin-read";
import { applyMediaUrlOverlay, normalizeMetadataBlobForOverlay } from "./media-overlay";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import {
	getPageContentWithDefaults,
	parseGlobalContent,
	parsePageContentMap,
	parsePageSeoMap,
	parseSiteSettings,
} from "./parsers";
import type {
	ContentPageId,
	GlobalContent,
	PageContent,
	SeoMeta,
	SiteSettings,
} from "./types";

import { STATIC_CMS_MEDIA_URL_MAP } from "./static-cms-media-map";

/**
 * Hybryda CMS:
 * - tekst / SEO → live z DataStore / Medusa (tag `moduly-content`),
 * - obrazy → opublikowane z mapy prebuild (`/images/cms/…`).
 */
async function getContentBlob() {
	const live = await fetchStoreMetadataBlob();
	if (!live) return null;
	const map = STATIC_CMS_MEDIA_URL_MAP;
	return applyMediaUrlOverlay(normalizeMetadataBlobForOverlay(live), map);
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
	const blob = await getContentBlob();
	if (!blob?.siteSettings) return DEFAULT_SITE_SETTINGS;
	return parseSiteSettings(blob.siteSettings);
});

export const getPageSeo = cache(async (pageId: ContentPageId): Promise<SeoMeta | undefined> => {
	const blob = await getContentBlob();
	if (!blob?.pageSeo) return undefined;
	const map = parsePageSeoMap(blob.pageSeo);
	return map[pageId];
});

export const getPageContent = cache(async (pageId: ContentPageId): Promise<PageContent> => {
	const blob = await getContentBlob();
	const map = blob?.pageContent ? parsePageContentMap(blob.pageContent) : {};
	return getPageContentWithDefaults(map, pageId);
});

export const getGlobalContent = cache(async (): Promise<GlobalContent> => {
	const blob = await getContentBlob();
	if (!blob?.globalContent) {
		return parseGlobalContent(null);
	}
	return parseGlobalContent(blob.globalContent);
});

export type HomepageInstagramTile = {
	id: string;
	permalink: string;
	imageUrl: string;
	alt: string;
};

export function instagramTilesFromGlobalContent(
	global: GlobalContent,
	defaultAlt = "Profil w mediach społecznościowych",
): HomepageInstagramTile[] {
	const rows = global.instagramTiles;
	if (!rows?.length) return [];
	return rows.slice(0, 6).map((row) => ({
		id: row.id,
		permalink: row.postUrl,
		imageUrl: row.imageUrl,
		alt: row.alt?.trim() || defaultAlt,
	}));
}

export async function getHomepageInstagramTiles(
	defaultAlt?: string,
): Promise<HomepageInstagramTile[]> {
	const global = await getGlobalContent();
	return instagramTilesFromGlobalContent(global, defaultAlt);
}

export { buildMetadata, type BuildMetadataOptions } from "./metadata";
export { MODULY_CONTENT_CACHE_TAG, PRODUCT_SEO_KEYS } from "./metadata-keys";
export { revalidateContentCache, type RevalidateContentResult } from "./revalidate-content";
