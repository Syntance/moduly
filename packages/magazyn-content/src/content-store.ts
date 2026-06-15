import "server-only";
import {
	MAGAZYN_GLOBAL_CONTENT_KEY,
	MAGAZYN_PAGE_CONTENT_KEY,
	MAGAZYN_SITE_SETTINGS_KEY,
} from "@moduly/cms/metadata-keys";
import {
	globalContentSchema,
	pageContentMapSchema,
	pageContentSchema,
	parseGlobalContentForAdmin,
	parseJsonValue,
	parsePageContentMapForAdmin,
	parseSiteSettingsForAdmin,
	siteSettingsSchema,
} from "@moduly/cms/parsers";
import type { GlobalContent, PageContent, PageContentMap, SiteSettings } from "@moduly/types";
import { getMedusaStore, mergeStoreMetadata, readMetadataJson } from "./store-metadata";

export type ContentBundle = {
	siteSettings: SiteSettings;
	pageContent: PageContentMap;
	globalContent: GlobalContent;
};

export async function getContentBundle(): Promise<ContentBundle> {
	const store = await getMedusaStore();
	return {
		siteSettings: parseSiteSettingsForAdmin(readMetadataJson(store, MAGAZYN_SITE_SETTINGS_KEY)),
		pageContent: parsePageContentMapForAdmin(readMetadataJson(store, MAGAZYN_PAGE_CONTENT_KEY)),
		globalContent: parseGlobalContentForAdmin(readMetadataJson(store, MAGAZYN_GLOBAL_CONTENT_KEY)),
	};
}

export async function savePageContent(pageId: string, content: PageContent): Promise<void> {
	const store = await getMedusaStore();
	const raw = readMetadataJson(store, MAGAZYN_PAGE_CONTENT_KEY);
	const current = parseJsonValue(raw, pageContentMapSchema) ?? {};
	const parsedPage = pageContentSchema.parse(content);
	const next: PageContentMap = { ...current, [pageId]: parsedPage };
	const parsed = pageContentMapSchema.parse(next);
	await mergeStoreMetadata({
		[MAGAZYN_PAGE_CONTENT_KEY]: JSON.stringify(parsed),
	});
}

export async function saveGlobalContent(global: GlobalContent): Promise<void> {
	const parsed = globalContentSchema.parse(global);
	await mergeStoreMetadata({
		[MAGAZYN_GLOBAL_CONTENT_KEY]: JSON.stringify(parsed),
	});
}

export async function saveSiteSettingsPartial(settings: SiteSettings): Promise<void> {
	const parsed = siteSettingsSchema.parse(settings);
	await mergeStoreMetadata({
		[MAGAZYN_SITE_SETTINGS_KEY]: JSON.stringify(parsed),
	});
}

export async function getPageContentForAdmin(pageId: string): Promise<PageContent> {
	const bundle = await getContentBundle();
	return bundle.pageContent[pageId] ?? {};
}
