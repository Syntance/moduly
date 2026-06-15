import "server-only";
import {
	MAGAZYN_PAGE_SEO_KEY,
	MAGAZYN_SITE_SETTINGS_KEY,
} from "@moduly/cms/metadata-keys";
import {
	parsePageSeoMapForAdmin,
	parseSiteSettingsForAdmin,
	siteSettingsSchema,
	pageSeoMapSchema,
	normalizeSeoMeta,
	parseJsonValue,
} from "@moduly/cms/parsers";
import type { PageSeoMap, SeoMeta, SiteSettings } from "@moduly/types";
import { getMedusaStore, mergeStoreMetadata, readMetadataJson } from "../store-metadata";

export type SeoSettingsBundle = {
	siteSettings: SiteSettings;
	pageSeo: PageSeoMap;
};

export async function getSeoSettingsBundle(): Promise<SeoSettingsBundle> {
	const store = await getMedusaStore();
	return {
		siteSettings: parseSiteSettingsForAdmin(readMetadataJson(store, MAGAZYN_SITE_SETTINGS_KEY)),
		pageSeo: parsePageSeoMapForAdmin(readMetadataJson(store, MAGAZYN_PAGE_SEO_KEY)),
	};
}

/**
 * Pola zarządzane przez formularz GLOBALNEGO SEO. Pozostałe pola `SiteSettings`
 * (announcementBar, trustBar, checkoutCallout, socialLinks, footerText) NIE są
 * częścią tego formularza i muszą zostać zachowane przy zapisie.
 */
const GLOBAL_SEO_FIELDS = [
	"title",
	"description",
	"titleTemplate",
	"defaultOgImageUrl",
	"googleSiteVerification",
	"seo",
] as const;

export async function saveGlobalSeoSettings(settings: SiteSettings): Promise<void> {
	// Read-modify-write: czytamy aktualne ustawienia witryny i nakładamy WYŁĄCZNIE
	// pola SEO. Bez tego zapis SEO nadpisywał cały `magazyn_site_settings`
	// wartościami domyślnymi, kasując pasek zapowiedzi, trust bar, social i stopkę.
	const store = await getMedusaStore();
	const current = parseSiteSettingsForAdmin(readMetadataJson(store, MAGAZYN_SITE_SETTINGS_KEY));

	const merged: SiteSettings = { ...current };
	for (const field of GLOBAL_SEO_FIELDS) {
		(merged as Record<string, unknown>)[field] = (settings as Record<string, unknown>)[field];
	}

	const parsed = siteSettingsSchema.parse(merged);
	await mergeStoreMetadata({
		[MAGAZYN_SITE_SETTINGS_KEY]: JSON.stringify(parsed),
	});
}

export async function savePageSeo(pageId: string, seo: SeoMeta): Promise<void> {
	const store = await getMedusaStore();
	const raw = readMetadataJson(store, MAGAZYN_PAGE_SEO_KEY);
	const current = parseJsonValue(raw, pageSeoMapSchema) ?? {};
	const next: PageSeoMap = {
		...current,
		[pageId]: normalizeSeoMeta(seo) ?? {},
	};
	const parsed = pageSeoMapSchema.parse(next);
	await mergeStoreMetadata({
		[MAGAZYN_PAGE_SEO_KEY]: JSON.stringify(parsed),
	});
}

export async function saveAllPageSeo(pageSeo: PageSeoMap): Promise<void> {
	const parsed = pageSeoMapSchema.parse(pageSeo);
	await mergeStoreMetadata({
		[MAGAZYN_PAGE_SEO_KEY]: JSON.stringify(parsed),
	});
}
