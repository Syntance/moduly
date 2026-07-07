import {
	BadgePercent,
	BarChart3,
	FileText,
	LayoutGrid,
	Mail,
	MessageSquare,
	Package,
	RotateCcw,
	Settings,
	ShoppingBag,
	Tags,
	type LucideIcon,
} from "lucide-react";
import type { ModulesToggle, NavItem, PanelConfig } from "./types";

const MODULE_NAV: Record<
	keyof Omit<ModulesToggle, "statistics">,
	{ segment: string; label: string; icon: LucideIcon }
> = {
	orders: { segment: "zamowienia", label: "Zamówienia", icon: ShoppingBag },
	products: { segment: "produkty", label: "Produkty", icon: Package },
	categories: { segment: "kategorie", label: "Kategorie", icon: Tags },
	promotions: {
		segment: "kody-promocyjne",
		label: "Kody promocyjne",
		icon: BadgePercent,
	},
	content: { segment: "cms", label: "CMS", icon: FileText },
	emails: { segment: "maile", label: "E-maile", icon: Mail },
	forms: { segment: "formularze", label: "Formularze", icon: MessageSquare },
	returns: { segment: "zwroty", label: "Zwroty i reklamacje", icon: RotateCcw },
	settings: { segment: "ustawienia", label: "Ustawienia sklepu", icon: Settings },
};

const ORDER: Array<keyof Omit<ModulesToggle, "statistics">> = [
	"orders",
	"returns",
	"products",
	"categories",
	"promotions",
	"content",
	"emails",
	"forms",
	"settings",
];

/** Buduje listę linków nawigacji — kolejność jak w panelu demo (Lumine). */
export function buildNavItems(config: Pick<PanelConfig, "basePath" | "modules">): NavItem[] {
	const { basePath, modules } = config;
	const panel = `${basePath}/panel`;
	const items: NavItem[] = [
		{ href: panel, label: "Przegląd", icon: LayoutGrid, exact: true },
	];

	if (modules.statistics !== false) {
		items.push({
			href: `${panel}/statystyki`,
			label: "Statystyki",
			icon: BarChart3,
			exact: false,
		});
	}

	for (const key of ORDER) {
		if (!modules[key]) continue;
		const def = MODULE_NAV[key];
		items.push({
			href: `${panel}/${def.segment}`,
			label: def.label,
			icon: def.icon,
			exact: false,
		});
	}

	return items;
}
