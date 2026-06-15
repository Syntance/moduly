import { defaultModulyConfig, type ModulyConfig } from "@moduly/config";

export type MagazynCoreConfig = {
	/** Nazwa cookie z tokenem JWT admina — z `moduly.config.ts` → `auth.cookieName`. */
	adminCookieName: string;
};

let adminCookieName = defaultModulyConfig.auth.cookieName;
let modulyConfig: ModulyConfig = defaultModulyConfig;

/** Ustaw cookie sesji admina (wywołaj raz przy starcie aplikacji z `moduly.config.ts`). */
export function configureMagazynCore(config: MagazynCoreConfig): void {
	adminCookieName = config.adminCookieName;
}

/** Pełna konfiguracja instancji Moduly — wywołaj raz w `moduly.config.ts`. */
export function configureMagazynModules(config: ModulyConfig): void {
	modulyConfig = config;
	configureMagazynCore({ adminCookieName: config.auth.cookieName });
}

export function getAdminCookieName(): string {
	return adminCookieName;
}

export function getModulyConfig(): ModulyConfig {
	return modulyConfig;
}
