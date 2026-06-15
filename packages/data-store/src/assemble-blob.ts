import type { DataStore } from "@moduly/types";
import type { RawStoreMetadataBlob } from "./types";

/**
 * Składa surowy blob CMS z metod DataStore (Postgres / pliki).
 * Wartości są już zparsowane — sync i overlay operują na obiektach.
 */
export async function assembleMetadataBlobFromDataStore(
	store: DataStore,
	pageIds: string[],
): Promise<RawStoreMetadataBlob> {
	const [siteSettings, globalContent, pageSeoEntries, pageContentEntries] = await Promise.all([
		store.getSiteSettings(),
		store.getGlobalContent(),
		Promise.all(pageIds.map(async (id) => [id, await store.getPageSeo(id)] as const)),
		Promise.all(pageIds.map(async (id) => [id, await store.getPageContent(id)] as const)),
	]);

	const pageSeo: Record<string, unknown> = {};
	for (const [id, seo] of pageSeoEntries) {
		if (seo) pageSeo[id] = seo;
	}

	const pageContent: Record<string, unknown> = {};
	for (const [id, content] of pageContentEntries) {
		if (content) pageContent[id] = content;
	}

	return {
		siteSettings,
		pageSeo,
		pageContent,
		globalContent,
	};
}
