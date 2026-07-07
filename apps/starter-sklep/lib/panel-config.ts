import type { PanelConfig } from "@moduly/ui";
import { modulyConfig } from "@/moduly.config";

/** Konfiguracja powĹ‚oki panelu magazynu dla @moduly/ui. */
export function getPanelConfig(): PanelConfig {
	const cfg = modulyConfig;
	return {
		basePath: cfg.basePath,
		branding: cfg.branding,
		modules: {
			orders: cfg.modules.orders,
			products: cfg.modules.products,
			categories: cfg.modules.categories,
			promotions: cfg.modules.promotions ?? true,
			content: cfg.modules.content,
			emails: cfg.modules.emails,
			settings: cfg.modules.settings,
			forms: cfg.modules.forms,
			returns: cfg.modules.returns,
			statistics: true,
		},
	};
}
