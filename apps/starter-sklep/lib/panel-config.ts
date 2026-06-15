import type { PanelConfig } from "@moduly/ui";
import { modulyConfig } from "@/moduly.config";

/** Konfiguracja powłoki panelu magazynu dla @moduly/ui. */
export function getPanelConfig(): PanelConfig {
	const cfg = modulyConfig;
	return {
		basePath: cfg.basePath,
		branding: cfg.branding,
		modules: {
			orders: cfg.modules.orders,
			products: cfg.modules.products,
			categories: cfg.modules.categories,
			content: cfg.modules.content,
			emails: cfg.modules.emails,
			settings: cfg.modules.settings,
		},
	};
}
