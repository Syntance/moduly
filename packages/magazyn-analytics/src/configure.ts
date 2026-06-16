import { defaultModulyConfig } from "@moduly/config";

export type MagazynAnalyticsConfig = {
	basePath: string;
};

let config: MagazynAnalyticsConfig = {
	basePath: defaultModulyConfig.basePath,
};

let adminGuard: (() => Promise<void>) | null = null;

export function configureMagazynAnalytics(
	next: Partial<MagazynAnalyticsConfig> & { guardAdmin?: () => Promise<void> },
): void {
	config = { ...config, ...next };
	if (next.guardAdmin) adminGuard = next.guardAdmin;
}

export function getMagazynAnalyticsConfig(): MagazynAnalyticsConfig {
	return config;
}

export async function requireAnalyticsAdmin(): Promise<void> {
	if (!adminGuard) {
		throw new Error(
			"Skonfiguruj guardAdmin w configureMagazynAnalytics przed wejściem w analitykę.",
		);
	}
	await adminGuard();
}
