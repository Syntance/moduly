import type { PanelConfig } from "@moduly/ui";
import { getModulyConfig } from "@moduly/magazyn-core/config";

/** Mapuje `moduly.config.ts` na konfigurację powłoki panelu `@moduly/ui`. */
export function toPanelConfig(): PanelConfig {
	const cfg = getModulyConfig();

	return {
		basePath: cfg.basePath,
		branding: cfg.branding,
		modules: {
			orders: cfg.modules.orders,
			products: cfg.modules.products,
			categories: cfg.modules.categories,
			emails: cfg.modules.emails,
			settings: cfg.modules.settings,
			content: cfg.modules.content,
			forms: cfg.modules.forms,
			returns: cfg.modules.returns,
			statistics: true,
		},
	};
}
