import {
	PRZELEWY24_PROVIDER_ID,
	STRIPE_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
	TPAY_PROVIDER_ID,
} from "@moduly/commerce/payments";
import { defaultModulyConfig, type ModulyConfig } from "@moduly/config";

/**
 * Konfiguracja instancji Moduly â€” edytuj pod nowy sklep.
 * Sekrety trzymaj w `.env.local` (patrz `.env.example`).
 *
 * Bez importĂłw server-only â€” bezpieczne dla middleware (Edge).
 */
export const modulyConfig: ModulyConfig = {
	...defaultModulyConfig,
	basePath: "/magazyn",

	branding: {
		name: "Moduly Sklep",
		panelTitle: "Magazyn",
		storefrontUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
	},

	auth: {
		cookieName: "moduly_sklep_admin_session",
		google: Boolean(process.env.GOOGLE_CLIENT_ID),
		provider: "medusa",
	},

	modules: {
		orders: true,
		products: true,
		categories: true,
		promotions: true,
		content: true,
		emails: true,
		settings: true,
		forms: true,
		returns: true,
	},

	content: {
		pages: [
			{
				id: "home",
				label: "Strona gĹ‚Ăłwna",
				path: "/",
				blocks: ["hero", "categoryTiles", "testimonials", "faq"],
			},
			{
				id: "shop",
				label: "Sklep",
				path: "/sklep",
				blocks: ["categoryTiles", "faq"],
			},
			{
				id: "contact",
				label: "Kontakt",
				path: "/kontakt",
				blocks: ["faq"],
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
		enabled: [
			PRZELEWY24_PROVIDER_ID,
			STRIPE_PROVIDER_ID,
			TPAY_PROVIDER_ID,
			SYSTEM_PAYMENT_PROVIDER_ID,
		],
		defaultProvider: PRZELEWY24_PROVIDER_ID,
		bankTransfer: {
			recipientName: "Moduly Sklep Sp. z o.o.",
			iban: process.env.BANK_TRANSFER_IBAN ?? "PL00000000000000000000000000",
			swift: process.env.BANK_TRANSFER_SWIFT ?? "EXAMPLEPL",
			addressLine1: "ul. PrzykĹ‚adowa 1",
			addressLine2: "00-001 Warszawa",
			paymentDays: 7,
			transferTitlePrefix: "ZamĂłwienie",
		},
	},

	commerce: {
		search: { enabled: true },
		currency: "pln",
		locale: "pl-PL",
	},

	email: {
		fromName: "Moduly Sklep",
		contactEmail: process.env.MODULY_CONTACT_EMAIL ?? "kontakt@example.com",
		footerText: "Moduly Sklep Â· Wszystkie prawa zastrzeĹĽone",
		siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
	},

	emailTheme: {
		...defaultModulyConfig.emailTheme,
		brandName: "Moduly Sklep",
	},
};
