import { LayoutGrid, Mail, Package, FileText, Settings, ShoppingBag, Tags, type LucideIcon } from "lucide-react";
import type { ModulesToggle, NavItem, PanelConfig } from "./types";

const MODULE_NAV: Record<keyof ModulesToggle, { segment: string; label: string; icon: LucideIcon }> = {
	orders: { segment: "zamowienia", label: "Zamówienia", icon: ShoppingBag },
	products: { segment: "produkty", label: "Produkty", icon: Package },
	categories: { segment: "kategorie", label: "Kategorie", icon: Tags },
	emails: { segment: "maile", label: "E-maile", icon: Mail },
	settings: { segment: "ustawienia", label: "Ustawienia sklepu", icon: Settings },
	content: { segment: "cms", label: "CMS", icon: FileText },
};

const ORDER: Array<keyof ModulesToggle> = ["orders", "products", "categories", "content", "emails", "settings"];

/** Buduje listę linków nawigacji z włączonych modułów. */
export function buildNavItems(config: Pick<PanelConfig, "basePath" | "modules">): NavItem[] {
	const { basePath, modules } = config;
	const items: NavItem[] = [
		{ href: `${basePath}/panel`, label: "Przegląd", icon: LayoutGrid, exact: true },
	];

	for (const key of ORDER) {
		if (!modules[key]) continue;
		const def = MODULE_NAV[key];
		items.push({
			href: `${basePath}/panel/${def.segment}`,
			label: def.label,
			icon: def.icon,
			exact: false,
		});
	}

	return items;
}
