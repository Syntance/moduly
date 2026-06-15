import type {
	GlobalContent,
	BrandingCtaContent,
	HeroContent,
	PageContentMap,
	SiteSettings,
} from "./types";

/**
 * Fallbacki TYLKO na copy / strukturę — bez URL-i obrazów.
 * Media (hero, galerie, kafelki, OG…) pochodzą z CMS; na produkcji lokalizowane
 * w prebuild do `/public/images/cms/` (mapa URL).
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
	title: "Sklep",
	description: "Opis witryny — edytuj w panelu CMS.",
	titleTemplate: "%s | Sklep",
	trustBar: {
		followers: "",
		realizations: "",
		shippingLabel: "",
	},
	checkoutCallout: {
		enabled: false,
		title: "Uwaga",
		message: "Sprawdź poprawność treści przed złożeniem zamówienia.",
		confirmLabel: "Rozumiem, kontynuuj",
	},
	socialLinks: {},
};

export const HOME_HERO_DEFAULT: HeroContent = {
	headline: "Witaj",
	subtitle: "",
	description: "Krótki opis oferty — edytuj w panelu CMS.",
	ctaLabel: "Zobacz ofertę",
	ctaHref: "/",
};

export const BRANDING_CTA_DEFAULT: BrandingCtaContent = {};

export const LOGO_HERO_DEFAULT: HeroContent = {
	headline: "Usługa brandingowa",
	description: "Opis sekcji — edytuj w panelu CMS.",
	ctaLabel: "Skontaktuj się",
	ctaHref: "#formularz",
	ctaAriaLabel: "Przewiń do formularza kontaktowego",
	headlineUppercase: false,
	ctaShowDownArrow: false,
};

export const DEFAULT_PAGE_CONTENT: PageContentMap = {
	home: { hero: HOME_HERO_DEFAULT, brandingCta: BRANDING_CTA_DEFAULT },
	shop: {},
};

export const DEFAULT_GLOBAL_CONTENT: GlobalContent = {
	salonLogos: [],
	instagramTiles: [],
};
