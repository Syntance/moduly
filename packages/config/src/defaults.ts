import type { ModulyConfig } from "./types";

/**
 * Domyślna konfiguracja startowa dla nowego projektu Moduly.
 * Wartości przykładowe — bez prawdziwych IBAN-ów ani sekretów.
 */
export const defaultModulyConfig: ModulyConfig = {
	basePath: "/panel",

	branding: {
		name: "Przykładowy Sklep",
		panelTitle: "Panel Moduly",
		storefrontUrl: "https://example.com",
	},

	auth: {
		cookieName: "moduly_admin_session",
		google: false,
		provider: "postgres",
	},

	modules: {
		orders: true,
		products: true,
		categories: true,
		content: true,
		emails: true,
		settings: true,
		forms: false,
		returns: false,
	},

	content: {
		pages: [
			{
				id: "home",
				label: "Strona główna",
				path: "/",
				blocks: ["hero", "testimonials"],
			},
			{
				id: "shop",
				label: "Sklep",
				path: "/sklep",
				blocks: ["categoryTiles", "faq"],
			},
		],
		globalBlocks: [
			"announcementBar",
			"trustBar",
			"socialLinks",
			"footerText",
			"checkoutCallout",
		],
	},

	payments: {
		enabled: ["pp_system_default"],
		defaultProvider: "pp_system_default",
		bankTransfer: {
			recipientName: "Przykładowa Firma Sp. z o.o.",
			iban: "PL00000000000000000000000000",
			swift: "EXAMPLEPL",
			addressLine1: "ul. Przykładowa 1",
			addressLine2: "00-001 Warszawa",
			paymentDays: 7,
			transferTitlePrefix: "Zamówienie",
		},
	},

	commerce: {
		search: {
			enabled: true,
		},
		currency: "pln",
		locale: "pl-PL",
	},

	email: {
		fromName: "Przykładowy Sklep",
		contactEmail: "kontakt@example.com",
		footerText: "Przykładowy Sklep · Wszystkie prawa zastrzeżone",
		siteUrl: "https://example.com",
	},

	emailTheme: {
		bg: "#f4f4f5",
		contentBg: "#ffffff",
		text: "#3f3f46",
		heading: "#18181b",
		accent: "#2563eb",
		muted: "#71717a",
		link: "#2563eb",
		fontKey: "sans",
		headerFontKey: "serif",
		contentWidth: 600,
		radius: 8,
		headerBg: "#18181b",
		headerText: "#fafafa",
		headerEyebrow: "",
		brandName: "Przykładowy Sklep",
	},
};
