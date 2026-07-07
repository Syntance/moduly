import type { PaymentProvider } from "@moduly/types";

/** Czcionki marki + web-safe fallbacki w edytorze maili. */
export type EmailFontKey =
	| "gilroy"
	| "chronicle"
	| "binerka"
	| "serif"
	| "sans"
	| "mono";

export type EmailThemeConfig = {
	bg: string;
	contentBg: string;
	text: string;
	heading: string;
	accent: string;
	muted: string;
	link: string;
	fontKey: EmailFontKey;
	headerFontKey: EmailFontKey;
	contentWidth: number;
	radius: number;
	headerBg: string;
	headerText: string;
	headerEyebrow: string;
	brandName: string;
};

export type ModulesToggle = {
	orders: boolean;
	products: boolean;
	categories: boolean;
	content: boolean;
	emails: boolean;
	settings: boolean;
	forms: boolean;
	returns: boolean;
	/** Kody promocyjne (rabaty + darmowa dostawa) — domyślnie włączone w sklepie. */
	promotions?: boolean;
};

/** Blok treści CMS przypisany do podstrony lub sekcji globalnej. */
export type ContentBlockKey =
	| "hero"
	| "brandingCta"
	| "testimonials"
	| "faq"
	| "gallery"
	| "categoryTiles"
	| "announcementBar"
	| "trustBar"
	| "socialLinks"
	| "footerText"
	| "checkoutCallout"
	| "salonLogos"
	| "instagramTiles";

export type ContentPageConfig = {
	/** Stabilny identyfikator — nie zmieniaj po wdrożeniu bez migracji danych. */
	id: string;
	label: string;
	path: string;
	blocks: ContentBlockKey[];
};

export type ContentConfig = {
	pages: ContentPageConfig[];
	globalBlocks: ContentBlockKey[];
};

export type BrandingConfig = {
	/** Nazwa marki — nagłówek panelu i domyślny brand maili. */
	name: string;
	/** Podtytuł panelu (np. „Panel", „Magazyn"). */
	panelTitle: string;
	/** Adres publicznego sklepu (link „Otwórz sklep"). */
	storefrontUrl: string;
};

export type AuthConfig = {
	/** Nazwa cookie z tokenem sesji admina. Zmień per sklep, by uniknąć kolizji. */
	cookieName: string;
	/** Pokaż przycisk „Zaloguj przez Google" (wymaga providera w backendzie). */
	google: boolean;
	/** Backend uwierzytelniania: Medusa admin API albo własna tabela Postgres. */
	provider: "medusa" | "postgres";
};

export type EmailConfig = {
	/** Nazwa nadawcy w polu From (adres bierze się z ENV). */
	fromName: string;
	/** Adres kontaktowy wstawiany do treści maili. */
	contactEmail: string;
	/** Domyślna stopka maili. */
	footerText: string;
	/** Bazowy URL używany w linkach maili. */
	siteUrl: string;
};

export type BankTransferConfig = {
	recipientName: string;
	/** Numer IBAN (bez spacji). Można nadpisać przez ENV. */
	iban: string;
	swift: string;
	addressLine1: string;
	addressLine2: string;
	paymentDays: number;
	transferTitlePrefix: string;
};

export type PaymentsConfig = {
	/** Włączone providery płatności w checkoutcie. */
	enabled: PaymentProvider[];
	defaultProvider: PaymentProvider;
	bankTransfer: BankTransferConfig;
};

export type CommerceConfig = {
	search: {
		enabled: boolean;
	};
	/** Kod waluty ISO (np. „pln", „eur"). */
	currency: string;
	/** Locale do formatowania cen i dat (np. „pl-PL"). */
	locale: string;
};

/** Upload mediów panelu — ścieżki Route Handlerów (montuj re-export w `app/api/…`). */
export type StorageConfig = {
	/** POST multipart — domyślnie `/api/magazyn/cms-upload`. */
	cmsUploadApiPath?: string;
	/** POST presigned PUT do R2 — domyślnie `{cmsUploadApiPath}/presign`. */
	cmsUploadPresignApiPath?: string;
};

/**
 * Główna konfiguracja instancji Moduly.
 * Jeden plik `moduly.config.ts` w aplikacji steruje panelem, CMS i checkoutem.
 * NIE umieszczaj sekretów — trzymaj je w ENV.
 */
export type ModulyConfig = {
	/** Bazowa ścieżka panelu, np. „/panel", „/magazyn". */
	basePath: string;
	branding: BrandingConfig;
	auth: AuthConfig;
	modules: ModulesToggle;
	content: ContentConfig;
	payments: PaymentsConfig;
	commerce: CommerceConfig;
	email: EmailConfig;
	emailTheme: EmailThemeConfig;
	/** Opcjonalne ścieżki API uploadu CMS (bez sekretów). */
	storage?: StorageConfig;
};
