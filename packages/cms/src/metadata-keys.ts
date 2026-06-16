/** Klucze JSON w Store.metadata — namespace modułu Magazyn CMS. */
export const MAGAZYN_SITE_SETTINGS_KEY = "magazyn_site_settings";
export const MAGAZYN_PAGE_SEO_KEY = "magazyn_page_seo";
export const MAGAZYN_PAGE_CONTENT_KEY = "magazyn_page_content";
export const MAGAZYN_GLOBAL_CONTENT_KEY = "magazyn_global_content";
/** Ustawienia operacyjne panelu (powiadomienia itd.). */
export const MAGAZYN_PANEL_SETTINGS_KEY = "magazyn_panel_settings";

/** Klucze SEO/FAQ w product.metadata. */
export const PRODUCT_SEO_KEYS = {
	metaTitle: "seo_meta_title",
	metaDescription: "seo_meta_description",
	ogTitle: "seo_og_title",
	ogDescription: "seo_og_description",
	ogImage: "seo_og_image",
	canonicalUrl: "seo_canonical_url",
	noIndex: "seo_no_index",
	noFollow: "seo_no_follow",
	faq: "product_faq",
} as const;

export const MODULY_CONTENT_CACHE_TAG = "moduly-content";
