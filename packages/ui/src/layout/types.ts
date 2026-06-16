import type { LucideIcon } from "lucide-react";

export type ModulesToggle = {
	orders: boolean;
	products: boolean;
	categories: boolean;
	emails: boolean;
	settings: boolean;
	content: boolean;
	forms?: boolean;
	returns?: boolean;
	/** Domyślnie true — osobna strona analityki pod Przeglądem. */
	statistics?: boolean;
};

export type PanelBranding = {
	/** Nazwa marki — nagłówek panelu. */
	name: string;
	/** Podtytuł panelu (np. „Magazyn", „Panel"). */
	panelTitle: string;
	/** Adres publicznego sklepu (link „Otwórz sklep"). */
	storefrontUrl: string;
};

export type PanelConfig = {
	/** Bazowa ścieżka panelu, np. „/magazyn", „/panel". */
	basePath: string;
	branding: PanelBranding;
	modules: ModulesToggle;
};

export type NavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
	exact: boolean;
};

export type SettingsNavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
};
