import type { RawStoreMetadataBlob } from "./types";

const SITE_SETTINGS_KEY = "magazyn_site_settings";
const PAGE_SEO_KEY = "magazyn_page_seo";
const PAGE_CONTENT_KEY = "magazyn_page_content";
const GLOBAL_CONTENT_KEY = "magazyn_global_content";

const DEFAULT_CACHE_TAG = "moduly-content";
const FETCH_TIMEOUT_MS = 30_000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 750;

export type MedusaMetadataEnv = {
	backendUrl?: string;
	adminEmail?: string;
	adminPassword?: string;
};

function medusaBackendUrl(env: MedusaMetadataEnv = {}): string {
	return (
		env.backendUrl ??
		process.env.MEDUSA_BACKEND_URL?.trim() ??
		process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() ??
		"http://localhost:9000"
	).replace(/\/$/, "");
}

function resolveAdminEmail(email: string): string {
	const normalized = email.trim().toLowerCase();
	if (normalized === "lumine.strona@gmail.com") return "lumie.strona@gmail.com";
	return email.trim();
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedServiceToken: { token: string; at: number } | null = null;

async function getServiceToken(env: MedusaMetadataEnv): Promise<string | null> {
	const email = env.adminEmail ?? process.env.MEDUSA_ADMIN_EMAIL;
	const password = env.adminPassword?.trim() ?? process.env.MEDUSA_ADMIN_PASSWORD?.trim();
	if (!email || !password) return null;

	if (cachedServiceToken && Date.now() - cachedServiceToken.at < 60 * 60 * 1000) {
		return cachedServiceToken.token;
	}

	const baseUrl = medusaBackendUrl(env);

	for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
		try {
			const res = await fetch(`${baseUrl}/auth/user/emailpass`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: resolveAdminEmail(email),
					password,
				}),
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});

			if (!res.ok) {
				if (attempt < RETRY_ATTEMPTS - 1) {
					await sleep(RETRY_DELAY_MS * (attempt + 1));
					continue;
				}
				return null;
			}

			const data = (await res.json()) as { token?: string };
			if (!data.token) return null;

			cachedServiceToken = { token: data.token, at: Date.now() };
			return data.token;
		} catch {
			if (attempt < RETRY_ATTEMPTS - 1) {
				await sleep(RETRY_DELAY_MS * (attempt + 1));
			}
		}
	}

	return null;
}

type FetchInitWithNext = RequestInit & {
	next?: { revalidate?: number; tags?: string[] };
};

async function fetchStoreMetadataWithRetry(
	token: string,
	env: MedusaMetadataEnv,
	options: { cacheTag: string; revalidateSeconds: number },
): Promise<Response | null> {
	const url = `${medusaBackendUrl(env)}/admin/stores?limit=1&fields=id,metadata`;

	for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
		try {
			const init: FetchInitWithNext = {
				headers: { Authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			};

			if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
				init.next = {
					revalidate: options.revalidateSeconds,
					tags: [options.cacheTag, "site-settings"],
				};
			}

			const res = await fetch(url, init);

			if (res.ok) return res;

			if (res.status >= 500 && attempt < RETRY_ATTEMPTS - 1) {
				await sleep(RETRY_DELAY_MS * (attempt + 1));
				continue;
			}

			return res;
		} catch {
			if (attempt < RETRY_ATTEMPTS - 1) {
				await sleep(RETRY_DELAY_MS * (attempt + 1));
			}
		}
	}

	return null;
}

export type FetchMedusaMetadataBlobOptions = {
	env?: MedusaMetadataEnv;
	cacheTag?: string;
	revalidateSeconds?: number;
};

/**
 * Odczyt surowego Store.metadata z Medusa Admin API.
 * Używane przez @moduly/cms (ISR) i skrypt sync-cms-to-static.
 */
export async function fetchMedusaMetadataBlob(
	options: FetchMedusaMetadataBlobOptions = {},
): Promise<RawStoreMetadataBlob | null> {
	const env = options.env ?? {};
	const cacheTag = options.cacheTag ?? DEFAULT_CACHE_TAG;
	const revalidateSeconds = options.revalidateSeconds ?? 3600;

	const email = env.adminEmail ?? process.env.MEDUSA_ADMIN_EMAIL;
	const password = env.adminPassword?.trim() ?? process.env.MEDUSA_ADMIN_PASSWORD?.trim();
	if (!email || !password) {
		if (process.env.NODE_ENV === "development") {
			console.warn(
				"[moduly/data-store] Brak MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD — pomijam odczyt CMS.",
			);
		}
		return null;
	}

	const token = await getServiceToken(env);
	if (!token) {
		console.warn("[moduly/data-store] Logowanie do Medusa Admin nie powiodło się.");
		return null;
	}

	const res = await fetchStoreMetadataWithRetry(token, env, { cacheTag, revalidateSeconds });
	if (!res?.ok) {
		console.error(`[moduly/data-store] Fetch Store.metadata failed: ${res?.status ?? "no response"}`);
		return null;
	}

	try {
		const data = (await res.json()) as {
			stores: Array<{ metadata?: Record<string, unknown> | null }>;
		};
		const metadata = data.stores[0]?.metadata ?? {};

		return {
			siteSettings: metadata[SITE_SETTINGS_KEY],
			pageSeo: metadata[PAGE_SEO_KEY],
			pageContent: metadata[PAGE_CONTENT_KEY],
			globalContent: metadata[GLOBAL_CONTENT_KEY],
		};
	} catch (error) {
		console.error("[moduly/data-store] Błąd parsowania Store.metadata:", error);
		return null;
	}
}

/** Klucze JSON w Store.metadata — namespace Magazyn CMS. */
export const MEDUSA_METADATA_KEYS = [
	SITE_SETTINGS_KEY,
	PAGE_SEO_KEY,
	PAGE_CONTENT_KEY,
	GLOBAL_CONTENT_KEY,
] as const;
