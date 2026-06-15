import { Palette, Paintbrush, Search } from "lucide-react";
import type { SettingsNavItem } from "./types";

/** Pozycje menu w sekcji Ustawienia sklepu (sidebar). */
export function buildSettingsNavItems(basePath: string): SettingsNavItem[] {
	const base = `${basePath}/panel/ustawienia`;

	return [
		{ href: `${base}/kolory`, label: "Kolory", icon: Palette },
		{ href: `${base}/motywy`, label: "Motywy magazynu", icon: Paintbrush },
		{ href: `${base}/seo`, label: "SEO", icon: Search },
	];
}

export function isSettingsPath(pathname: string, basePath: string): boolean {
	return pathname.startsWith(`${basePath}/panel/ustawienia`);
}
