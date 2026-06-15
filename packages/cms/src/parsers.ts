import { z } from "zod";
import { resolveCmsAssetUrl } from "./asset-url";
import { isCmsMediaAssetUrl } from "./cms-media-gate";
import { normalizeHeroCtaHref } from "./cta-href";
import {
	DEFAULT_GLOBAL_CONTENT,
	DEFAULT_PAGE_CONTENT,
	DEFAULT_SITE_SETTINGS,
	HOME_HERO_DEFAULT,
	LOGO_HERO_DEFAULT,
} from "./defaults";
import type {
	GlobalContent,
	HeroContent,
	PageContent,
	PageContentMap,
	PageSeoMap,
	ProductFaqItem,
	ProductSeoMeta,
	SeoMeta,
	SiteSettings,
} from "./types";

function isAbsoluteUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function isCmsAssetUrl(value: string): boolean {
	if (value.startsWith("//")) return false;
	return value.startsWith("/") || isAbsoluteUrl(value);
}

function isSafeCmsLink(value: string): boolean {
	const v = value.trim();
	if (v === "") return true;
	if (v.startsWith("//")) return false;
	if (v.startsWith("/") || v.startsWith("#")) return true;
	if (/^mailto:/i.test(v) || /^tel:/i.test(v)) return true;
	return isAbsoluteUrl(v);
}

function sanitizeCmsHref(value: string): string {
	return isSafeCmsLink(value) ? value.trim() : "#";
}

const cmsOptionalAssetUrlSchema = z
	.string()
	.refine((val) => val === "" || isCmsAssetUrl(val), {
		message: "Podaj poprawny URL obrazu.",
	});

const cmsRequiredAssetUrlSchema = z
	.string()
	.min(1)
	.refine(isCmsAssetUrl, { message: "Podaj poprawny URL obrazu." });

const cmsExternalUrlSchema = z
	.string()
	.min(1)
	.refine(isAbsoluteUrl, { message: "Podaj poprawny adres URL (https://…)." });

const cmsOptionalExternalUrlSchema = z
	.string()
	.refine((val) => val === "" || isAbsoluteUrl(val), {
		message: "Podaj poprawny adres URL (https://…).",
	});

const seoMetaSchema = z.object({
	metaTitle: z.string().optional(),
	metaDescription: z.string().optional(),
	ogTitle: z.string().optional(),
	ogDescription: z.string().optional(),
	ogImageUrl: cmsOptionalAssetUrlSchema.optional(),
	canonicalUrl: cmsOptionalExternalUrlSchema.optional(),
	noIndex: z.boolean().optional(),
	noFollow: z.boolean().optional(),
});

export const siteSettingsSchema = z.object({
	title: z.string().min(1),
	description: z.string(),
	announcementBar: z
		.object({
			enabled: z.boolean(),
			text: z.string(),
			link: z
				.string()
				.optional()
				.transform((v) => (v && isSafeCmsLink(v) ? v.trim() : undefined)),
		})
		.optional(),
	trustBar: z
		.object({
			followers: z.string().optional(),
			realizations: z.string().optional(),
			shippingLabel: z.string().optional(),
		})
		.optional(),
	checkoutCallout: z
		.object({
			enabled: z.boolean().optional(),
			title: z.string().optional(),
			message: z.string().optional(),
			confirmLabel: z.string().optional(),
		})
		.optional(),
	socialLinks: z
		.object({
			instagram: cmsOptionalExternalUrlSchema.optional(),
			facebook: cmsOptionalExternalUrlSchema.optional(),
			tiktok: cmsOptionalExternalUrlSchema.optional(),
		})
		.optional(),
	footerText: z.string().optional(),
	seo: seoMetaSchema.optional(),
	titleTemplate: z.string().optional(),
	defaultOgImageUrl: cmsOptionalAssetUrlSchema.optional(),
	googleSiteVerification: z.string().optional(),
});

export const pageSeoMapSchema = z.record(z.string(), seoMetaSchema);

const heroSchema = z.object({
	desktopImageUrl: z.string().optional(),
	mobileImageUrl: z.string().optional(),
	headline: z.string().min(1),
	subtitle: z.string().optional(),
	description: z.string(),
	ctaLabel: z.string().min(1),
	ctaHref: z.string().min(1).transform(sanitizeCmsHref),
	ctaAriaLabel: z.string().optional(),
	headlineUppercase: z.boolean().optional(),
	ctaShowDownArrow: z.boolean().optional(),
});

const testimonialSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	role: z.string().optional(),
	company: z.string(),
	quote: z.string().min(1),
	imageUrl: cmsOptionalAssetUrlSchema.optional(),
	rating: z.number().int().min(1).max(5),
	order: z.number().int(),
});

const faqSchema = z.object({
	id: z.string().min(1),
	question: z.string().min(1),
	answer: z.string().min(1),
	order: z.number().int(),
});

const galleryPhotoSchema = z.object({
	id: z.string().min(1),
	imageUrl: cmsRequiredAssetUrlSchema,
	alt: z.string().optional(),
	order: z.number().int(),
});

const categoryTileSchema = z.object({
	title: z.string().min(1),
	cta: z.string().min(1),
	href: z.string().min(1).transform(sanitizeCmsHref),
	imageUrl: z.string().min(1),
});

const brandingCtaSchema = z.object({
	desktopBackgroundUrl: cmsOptionalAssetUrlSchema.optional(),
});

export const pageContentSchema = z.object({
	hero: heroSchema.optional(),
	brandingCta: brandingCtaSchema.optional(),
	testimonials: z.array(testimonialSchema).optional(),
	faq: z.array(faqSchema).optional(),
	gallery: z.array(galleryPhotoSchema).optional(),
	categoryTiles: z.array(categoryTileSchema).optional(),
});

export const pageContentMapSchema = z.record(z.string(), pageContentSchema);

const salonLogoSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	logoUrl: cmsOptionalAssetUrlSchema.optional(),
	description: z.string().optional(),
	alt: z.string().optional(),
	order: z.number().int(),
});

const instagramTileSchema = z.object({
	id: z.string().min(1),
	postUrl: cmsExternalUrlSchema,
	imageUrl: cmsRequiredAssetUrlSchema,
	alt: z.string().optional(),
});

function resolvePublishedImageUrl(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const resolved = resolveCmsAssetUrl(raw);
	if (resolved) return resolved;
	if (isCmsMediaAssetUrl(raw)) return undefined;
	return raw;
}

function resolveSeoAssets(seo: SeoMeta | undefined): SeoMeta | undefined {
	if (!seo) return seo;
	const ogImageUrl = resolvePublishedImageUrl(seo.ogImageUrl);
	return ogImageUrl ? { ...seo, ogImageUrl } : seo;
}

function resolveHeroAssets(hero: HeroContent | undefined): HeroContent | undefined {
	if (!hero) return hero;
	const desktopImageUrl = resolvePublishedImageUrl(hero.desktopImageUrl);
	const mobileImageUrl = resolvePublishedImageUrl(hero.mobileImageUrl);
	return {
		...hero,
		...(desktopImageUrl ? { desktopImageUrl } : {}),
		...(mobileImageUrl ? { mobileImageUrl } : {}),
	};
}

function resolvePageContentAssets(content: PageContent): PageContent {
	return {
		...content,
		hero: resolveHeroAssets(content.hero),
		brandingCta: content.brandingCta
			? (() => {
					const desktopBackgroundUrl = resolvePublishedImageUrl(
						content.brandingCta.desktopBackgroundUrl,
					);
					return {
						...content.brandingCta,
						...(desktopBackgroundUrl ? { desktopBackgroundUrl } : {}),
					};
				})()
			: content.brandingCta,
		testimonials: content.testimonials?.map((item) => {
			if (!item.imageUrl?.trim()) return item;
			const imageUrl = resolvePublishedImageUrl(item.imageUrl);
			if (imageUrl) return { ...item, imageUrl };
			const { imageUrl: _removed, ...rest } = item;
			return rest;
		}),
		gallery: content.gallery
			?.map((item) => {
				const imageUrl = resolvePublishedImageUrl(item.imageUrl);
				if (!imageUrl) return null;
				return { ...item, imageUrl };
			})
			.filter((item): item is NonNullable<typeof item> => item !== null),
		categoryTiles: content.categoryTiles
			?.map((item) => {
				const imageUrl = resolvePublishedImageUrl(item.imageUrl);
				if (!imageUrl) return null;
				return { ...item, imageUrl };
			})
			.filter((item): item is NonNullable<typeof item> => item !== null),
	};
}

function resolveGlobalContentAssets(global: GlobalContent): GlobalContent {
	return {
		...global,
		salonLogos: global.salonLogos
			?.map((logo) => {
				const logoUrl = resolvePublishedImageUrl(logo.logoUrl);
				if (!logoUrl) return null;
				return { ...logo, logoUrl };
			})
			.filter((item): item is NonNullable<typeof item> => item !== null),
		instagramTiles: global.instagramTiles
			?.map((tile) => {
				const imageUrl = resolvePublishedImageUrl(tile.imageUrl);
				if (!imageUrl) return null;
				return { ...tile, imageUrl };
			})
			.filter((item): item is NonNullable<typeof item> => item !== null),
	};
}

export function prepareGlobalContentForSave(global: GlobalContent): GlobalContent {
	return {
		...global,
		salonLogos: global.salonLogos
			?.map((logo) => ({
				...logo,
				name: logo.name.trim(),
				logoUrl: logo.logoUrl?.trim() || undefined,
				description: logo.description?.trim() || undefined,
				alt: logo.alt?.trim() || undefined,
			}))
			.filter((logo) => logo.name.length > 0),
		instagramTiles: global.instagramTiles
			?.map((tile) => ({
				...tile,
				postUrl: tile.postUrl.trim(),
				imageUrl: tile.imageUrl.trim(),
			}))
			.filter((tile) => tile.postUrl !== "" && tile.imageUrl.trim() !== ""),
	};
}

export const globalContentSchema = z.object({
	salonLogos: z.array(salonLogoSchema).optional(),
	instagramTiles: z.array(instagramTileSchema).max(6).optional(),
});

export const productFaqSchema = z.array(
	z.object({
		id: z.string().min(1),
		question: z.string().min(1),
		answer: z.string().min(1),
		order: z.number().int(),
	}),
);

export function parseJsonValue<T>(raw: unknown, schema: z.ZodType<T>): T | null {
	if (raw == null || raw === "") return null;
	try {
		const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
		const parsed = schema.safeParse(value);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function parseSiteSettings(raw: unknown): SiteSettings {
	const parsed = parseJsonValue(raw, siteSettingsSchema);
	if (!parsed) return DEFAULT_SITE_SETTINGS;
	return {
		...DEFAULT_SITE_SETTINGS,
		...parsed,
		trustBar: { ...DEFAULT_SITE_SETTINGS.trustBar, ...parsed.trustBar },
		checkoutCallout: {
			...DEFAULT_SITE_SETTINGS.checkoutCallout,
			...parsed.checkoutCallout,
		},
		socialLinks: { ...DEFAULT_SITE_SETTINGS.socialLinks, ...parsed.socialLinks },
		defaultOgImageUrl: resolveCmsAssetUrl(parsed.defaultOgImageUrl),
		seo: resolveSeoAssets(parsed.seo),
	};
}

export function parseSiteSettingsForAdmin(raw: unknown): SiteSettings {
	const parsed = parseJsonValue(raw, siteSettingsSchema);
	if (!parsed) return DEFAULT_SITE_SETTINGS;
	return {
		...DEFAULT_SITE_SETTINGS,
		...parsed,
		trustBar: { ...DEFAULT_SITE_SETTINGS.trustBar, ...parsed.trustBar },
		checkoutCallout: {
			...DEFAULT_SITE_SETTINGS.checkoutCallout,
			...parsed.checkoutCallout,
		},
		socialLinks: { ...DEFAULT_SITE_SETTINGS.socialLinks, ...parsed.socialLinks },
	};
}

export function parsePageSeoMap(raw: unknown): PageSeoMap {
	const parsed = parseJsonValue(raw, pageSeoMapSchema) ?? {};
	const resolved: PageSeoMap = {};
	for (const [key, seo] of Object.entries(parsed)) {
		resolved[key] = resolveSeoAssets(seo);
	}
	return resolved;
}

export function parsePageSeoMapForAdmin(raw: unknown): PageSeoMap {
	return parseJsonValue(raw, pageSeoMapSchema) ?? {};
}

export function parsePageContentMap(raw: unknown): PageContentMap {
	const parsed = parseJsonValue(raw, pageContentMapSchema) ?? {};
	const merged: PageContentMap = { ...DEFAULT_PAGE_CONTENT };
	for (const [key, value] of Object.entries(parsed)) {
		const pageKey = key;
		const defaults = DEFAULT_PAGE_CONTENT[pageKey];
		merged[pageKey] = resolvePageContentAssets({
			...defaults,
			...value,
			hero: mergeHeroWithDefaults(value.hero, pageKey) ?? defaults?.hero,
		});
	}
	return merged;
}

export function parsePageContentMapForAdmin(raw: unknown): PageContentMap {
	const parsed = parseJsonValue(raw, pageContentMapSchema) ?? {};
	const merged: PageContentMap = { ...DEFAULT_PAGE_CONTENT };
	for (const [key, value] of Object.entries(parsed)) {
		const pageKey = key;
		const defaults = DEFAULT_PAGE_CONTENT[pageKey];
		merged[pageKey] = {
			...defaults,
			...value,
			hero: mergeHeroWithDefaultsForAdmin(value.hero, pageKey) ?? defaults?.hero,
		};
	}
	return merged;
}

export function parseGlobalContent(raw: unknown): GlobalContent {
	const parsed = parseJsonValue(raw, globalContentSchema);
	if (!parsed) return DEFAULT_GLOBAL_CONTENT;
	return resolveGlobalContentAssets({
		salonLogos: parsed.salonLogos?.length ? parsed.salonLogos : DEFAULT_GLOBAL_CONTENT.salonLogos,
		instagramTiles: parsed.instagramTiles ?? [],
	});
}

export function parseGlobalContentForAdmin(raw: unknown): GlobalContent {
	const parsed = parseJsonValue(raw, globalContentSchema);
	if (!parsed) return DEFAULT_GLOBAL_CONTENT;
	return {
		salonLogos: parsed.salonLogos?.length ? parsed.salonLogos : DEFAULT_GLOBAL_CONTENT.salonLogos,
		instagramTiles: parsed.instagramTiles ?? [],
	};
}

export function parseProductSeoFromMetadata(
	metadata: Record<string, unknown> | null | undefined,
): ProductSeoMeta | null {
	if (!metadata) return null;
	const seo: ProductSeoMeta = {};
	const title = metadata.seo_meta_title;
	if (typeof title === "string" && title.trim()) seo.metaTitle = title.trim();
	const desc = metadata.seo_meta_description;
	if (typeof desc === "string" && desc.trim()) seo.metaDescription = desc.trim();
	const ogTitle = metadata.seo_og_title;
	if (typeof ogTitle === "string" && ogTitle.trim()) seo.ogTitle = ogTitle.trim();
	const ogDesc = metadata.seo_og_description;
	if (typeof ogDesc === "string" && ogDesc.trim()) seo.ogDescription = ogDesc.trim();
	const ogImage = metadata.seo_og_image;
	if (typeof ogImage === "string" && ogImage.trim())
		seo.ogImageUrl = resolveCmsAssetUrl(ogImage.trim());
	const canonical = metadata.seo_canonical_url;
	if (typeof canonical === "string" && canonical.trim()) seo.canonicalUrl = canonical.trim();
	if (metadata.seo_no_index === "true" || metadata.seo_no_index === true) seo.noIndex = true;
	if (metadata.seo_no_follow === "true" || metadata.seo_no_follow === true) seo.noFollow = true;
	return Object.keys(seo).length > 0 ? seo : null;
}

export function parseProductFaqFromMetadata(
	metadata: Record<string, unknown> | null | undefined,
): ProductFaqItem[] {
	if (!metadata?.product_faq) return [];
	const raw = metadata.product_faq;
	try {
		const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
		const parsed = productFaqSchema.safeParse(value);
		return parsed.success ? parsed.data.sort((a, b) => a.order - b.order) : [];
	} catch {
		return [];
	}
}

export function serializeProductSeoForMetadata(seo: ProductSeoMeta): Record<string, string | undefined> {
	return {
		seo_meta_title: seo.metaTitle?.trim() || undefined,
		seo_meta_description: seo.metaDescription?.trim() || undefined,
		seo_og_title: seo.ogTitle?.trim() || undefined,
		seo_og_description: seo.ogDescription?.trim() || undefined,
		seo_og_image: seo.ogImageUrl?.trim() || undefined,
		seo_canonical_url: seo.canonicalUrl?.trim() || undefined,
		seo_no_index: seo.noIndex ? "true" : undefined,
		seo_no_follow: seo.noFollow ? "true" : undefined,
	};
}

export function serializeProductFaqForMetadata(faq: ProductFaqItem[]): string {
	return JSON.stringify(faq.sort((a, b) => a.order - b.order));
}

export function normalizeSeoMeta(seo: SeoMeta | undefined): SeoMeta | undefined {
	if (!seo) return undefined;
	const cleaned: SeoMeta = { ...seo };
	if (cleaned.ogImageUrl === "") delete cleaned.ogImageUrl;
	if (cleaned.canonicalUrl === "") delete cleaned.canonicalUrl;
	return cleaned;
}

export function getPageContentWithDefaults(
	map: PageContentMap,
	pageId: string,
): PageContent {
	return map[pageId] ?? DEFAULT_PAGE_CONTENT[pageId] ?? {};
}

export function mergeHeroWithDefaults(
	hero: HeroContent | undefined,
	pageId: string,
): HeroContent | undefined {
	const defaults =
		pageId === "home" ? HOME_HERO_DEFAULT : pageId === "logo-3d" ? LOGO_HERO_DEFAULT : undefined;
	if (!defaults) return hero;
	if (!hero) return defaults;

	const desktopImageUrl = normalizeLocalAssetUrl(hero.desktopImageUrl);
	const mobileImageUrl = normalizeLocalAssetUrl(hero.mobileImageUrl) || desktopImageUrl;

	return {
		...defaults,
		...hero,
		...(desktopImageUrl ? { desktopImageUrl } : {}),
		...(mobileImageUrl ? { mobileImageUrl } : {}),
		...(hero.desktopBlurDataURL ? { desktopBlurDataURL: hero.desktopBlurDataURL } : {}),
		...(hero.mobileBlurDataURL ? { mobileBlurDataURL: hero.mobileBlurDataURL } : {}),
	};
}

export function mergeHeroWithDefaultsForAdmin(
	hero: HeroContent | undefined,
	pageId: string,
): HeroContent | undefined {
	const defaults =
		pageId === "home" ? HOME_HERO_DEFAULT : pageId === "logo-3d" ? LOGO_HERO_DEFAULT : undefined;
	if (!defaults) return hero;
	if (!hero) return defaults;

	const desktopImageUrl = hero.desktopImageUrl?.trim() || undefined;
	const mobileImageUrl = hero.mobileImageUrl?.trim() || desktopImageUrl;

	return {
		...defaults,
		...hero,
		...(desktopImageUrl ? { desktopImageUrl } : {}),
		...(mobileImageUrl ? { mobileImageUrl } : {}),
		...(hero.desktopBlurDataURL ? { desktopBlurDataURL: hero.desktopBlurDataURL } : {}),
		...(hero.mobileBlurDataURL ? { mobileBlurDataURL: hero.mobileBlurDataURL } : {}),
	};
}

export function normalizeLocalAssetUrl(url: string | undefined): string | undefined {
	return resolveCmsAssetUrl(url);
}

export function preparePageContentForSave(_pageId: string, content: PageContent): PageContent {
	const next: PageContent = { ...content };
	if (next.hero) {
		const hero = { ...next.hero, ctaHref: normalizeHeroCtaHref(next.hero.ctaHref) };
		if (!hero.desktopImageUrl?.trim()) delete hero.desktopImageUrl;
		else hero.desktopImageUrl = hero.desktopImageUrl.trim();
		if (!hero.mobileImageUrl?.trim()) delete hero.mobileImageUrl;
		else hero.mobileImageUrl = hero.mobileImageUrl.trim();
		next.hero = hero;
	}
	if (next.brandingCta) {
		const branding = { ...next.brandingCta };
		if (!branding.desktopBackgroundUrl?.trim()) delete branding.desktopBackgroundUrl;
		else branding.desktopBackgroundUrl = branding.desktopBackgroundUrl.trim();
		next.brandingCta = Object.keys(branding).length ? branding : undefined;
	}
	if (next.gallery) {
		next.gallery = next.gallery
			.map((item) => ({ ...item, imageUrl: item.imageUrl.trim(), alt: item.alt?.trim() }))
			.filter((item) => item.imageUrl.length > 0);
	}
	return next;
}
