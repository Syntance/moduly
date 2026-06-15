import { defaultModulyConfig } from "@moduly/config";

let basePath = defaultModulyConfig.basePath;
let adminGuard: (() => Promise<void>) | null = null;

export function configureMagazynReturns(config: {
	basePath?: string;
	guardAdmin?: () => Promise<void>;
}): void {
	if (config.basePath) basePath = config.basePath;
	if (config.guardAdmin) adminGuard = config.guardAdmin;
}

export function getMagazynReturnsConfig() {
	return { basePath };
}

export async function requireReturnsAdmin(): Promise<void> {
	if (!adminGuard) {
		throw new Error(
			"Skonfiguruj guardAdmin w configureMagazynReturns przed akcjami panelu.",
		);
	}
	await adminGuard();
}
