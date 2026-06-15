import { defaultModulyConfig } from "@moduly/config";

export type MagazynFormsConfig = {
	basePath: string;
	contactEmail: string;
	accessibilityEmail?: string;
	caseNumberPrefix: string;
	contactPagePath: string;
	privacyPagePath: string;
	cookiesPagePath: string;
	accessibilityPagePath: string;
	customerPortalPaths: {
		regulations: string;
		account: string;
		claims: string;
		withdrawal: string;
	};
};

let config: MagazynFormsConfig = {
	basePath: defaultModulyConfig.basePath,
	contactEmail: defaultModulyConfig.email.contactEmail,
	caseNumberPrefix: "FK",
	contactPagePath: "/kontakt",
	privacyPagePath: "/polityka-prywatnosci",
	cookiesPagePath: "/polityka-cookies",
	accessibilityPagePath: "/deklaracja-dostepnosci",
	customerPortalPaths: {
		regulations: "/regulamin",
		account: "/konto",
		claims: "/konto/reklamacje",
		withdrawal: "/konto/odstapienie",
	},
};

let adminGuard: (() => Promise<void>) | null = null;

export function configureMagazynForms(
	next: Partial<MagazynFormsConfig> & { guardAdmin?: () => Promise<void> },
): void {
	config = { ...config, ...next };
	if (next.guardAdmin) adminGuard = next.guardAdmin;
}

export function getMagazynFormsConfig(): MagazynFormsConfig {
	return config;
}

export async function requireFormsAdmin(): Promise<void> {
	if (!adminGuard) {
		throw new Error(
			"Skonfiguruj guardAdmin w configureMagazynForms przed akcjami panelu.",
		);
	}
	await adminGuard();
}
