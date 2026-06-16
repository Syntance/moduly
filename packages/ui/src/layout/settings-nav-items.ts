import { Bell, CreditCard, Key, Paintbrush, Search, Settings, Shield, Truck } from "lucide-react";
import type { SettingsNavItem } from "./types";

/** Pozycje menu w sekcji Ustawienia sklepu (sidebar) — jak panel demo. */
export function buildSettingsNavItems(basePath: string): SettingsNavItem[] {
	const base = `${basePath}/panel/ustawienia`;

	return [
		{ href: `${base}/ogolne`, label: "Ogólne", icon: Settings },
		{ href: `${base}/platnosci`, label: "Płatności", icon: CreditCard },
		{ href: `${base}/dostawa`, label: "Dostawa", icon: Truck },
		{ href: `${base}/powiadomienia`, label: "Powiadomienia", icon: Bell },
		{ href: `${base}/bezpieczenstwo`, label: "Bezpieczeństwo", icon: Shield },
		{ href: `${base}/api`, label: "API & Webhooks", icon: Key },
		{ href: `${base}/motywy`, label: "Motywy magazynu", icon: Paintbrush },
		{ href: `${base}/seo`, label: "SEO", icon: Search },
	];
}

export function isSettingsPath(pathname: string, basePath: string): boolean {
	return pathname.startsWith(`${basePath}/panel/ustawienia`);
}
