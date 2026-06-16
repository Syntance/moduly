import "server-only";

import { MedusaAuth } from "@moduly/auth-core";
import { configureClientPanel } from "@moduly/client-panel/configure";
import { createPostgresClient, PostgresStore, setDataStore } from "@moduly/data-store";
import { configureMagazynAnalytics } from "@moduly/magazyn-analytics";
import { configureMagazynForms } from "@moduly/magazyn-forms";
import { requireAdminSession } from "@moduly/magazyn-core";
import { configureMagazynReturns } from "@moduly/magazyn-returns";
import { configureMagazynModules } from "@moduly/magazyn-core";
import { modulyConfig } from "@/moduly.config";
import { getSiteUrl } from "@/lib/site-url";

let initialized = false;

/** Jednorazowa konfiguracja modułów @moduly/* przy starcie serwera. */
export function initModuly(): void {
	if (initialized) return;
	initialized = true;

	configureMagazynModules(modulyConfig);

	const backendUrl =
		process.env.MEDUSA_BACKEND_URL?.trim() ??
		process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() ??
		"http://localhost:9000";

	const siteUrl = getSiteUrl();

	configureClientPanel({
		basePath: modulyConfig.basePath,
		brandName: modulyConfig.branding.name,
		siteUrl,
		contactEmail: modulyConfig.email.contactEmail,
		customerCookieName: process.env.CUSTOMER_SESSION_COOKIE ?? "customer_session",
		jwtSecret: process.env.CUSTOMER_JWT_SECRET ?? "dev-customer-secret-change-me",
		paths: {
			account: "/konto",
			claims: "/konto/reklamacje",
			withdrawal: "/konto/odstapienie",
		},
	});

	const guardAdmin = async () => {
		await requireAdminSession();
	};

	configureMagazynForms({
		basePath: modulyConfig.basePath,
		contactEmail: modulyConfig.email.contactEmail,
		contactPagePath: "/kontakt",
		guardAdmin,
	});

	configureMagazynReturns({
		basePath: modulyConfig.basePath,
		guardAdmin,
	});

	configureMagazynAnalytics({
		basePath: modulyConfig.basePath,
		guardAdmin,
	});

	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (databaseUrl) {
		const client = createPostgresClient(databaseUrl);
		setDataStore(new PostgresStore(client));
	}

	// MedusaAuth — gotowy provider admina (sesja cookie zarządzana przez magazyn-core).
	void new MedusaAuth({
		cookieName: modulyConfig.auth.cookieName,
		backendUrl: backendUrl.replace(/\/$/, ""),
	});
}
