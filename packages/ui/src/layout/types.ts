import type { LucideIcon } from "lucide-react";

export type ModulesToggle = {
	orders: boolean;
	products: boolean;
	categories: boolean;
	emails: boolean;
	settings: boolean;
	content: boolean;
	forms?: boolean;
	/** Kody promocyjne (rabaty + darmowa dostawa z regułą wykluczenia dopłaty express). */
	promotions?: boolean;
	returns?: boolean;
	/** DomyĹ›lnie true â€” osobna strona analityki pod PrzeglÄ…dem. */
	statistics?: boolean;
};

export type PanelBranding = {
	/** Nazwa marki â€” nagĹ‚Ăłwek panelu. */
	name: string;
	/** PodtytuĹ‚ panelu (np. â€žMagazyn", â€žPanel"). */
	panelTitle: string;
	/** Adres publicznego sklepu (link â€žOtwĂłrz sklep"). */
	storefrontUrl: string;
};

export type PanelConfig = {
	/** Bazowa Ĺ›cieĹĽka panelu, np. â€ž/magazyn", â€ž/panel". */
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
