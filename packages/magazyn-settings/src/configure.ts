import { defaultModulyConfig } from "@moduly/config";

export type CommerceBackend = "medusa" | "none";

export type MagazynSettingsConfig = {
	basePath: string;
	commerceBackend: CommerceBackend;
};

let config: MagazynSettingsConfig = {
	basePath: defaultModulyConfig.basePath,
	commerceBackend: "none",
};

let adminGuard: (() => Promise<void>) | null = null;

export function configureMagazynSettings(
	next: Partial<MagazynSettingsConfig> & { guardAdmin?: () => Promise<void> },
): void {
	config = { ...config, ...next };
	if (next.guardAdmin) adminGuard = next.guardAdmin;
}

export function getMagazynSettingsConfig(): MagazynSettingsConfig {
	return config;
}

export async function requireSettingsAdmin(): Promise<void> {
	if (!adminGuard) {
		throw new Error(
			"Skonfiguruj guardAdmin w configureMagazynSettings przed wejściem w ustawienia.",
		);
	}
	await adminGuard();
}
