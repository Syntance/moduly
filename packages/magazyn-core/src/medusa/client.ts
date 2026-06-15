import "server-only";

import { sleep } from "../lib/sleep";
import { serverEnv } from "../env";
import { AdminApiError, AdminUnauthorizedError, extractMessage } from "./errors";
import { getSessionToken } from "./session";

type AdminFetchInit = Omit<RequestInit, "body"> & {
	body?: string;
	next?: { revalidate?: number | false; tags?: string[] };
};

const ADMIN_FETCH_TIMEOUT_MS = 30_000;
const ADMIN_FETCH_RETRY_DELAYS_MS = [0, 1200, 2500, 4000] as const;
const TRANSIENT_ADMIN_STATUSES = new Set([502, 503, 504]);

/**
 * Konto admina w produkcyjnej Medusie zostało utworzone z literówką (lumie).
 * Do czasu migracji w bazie akceptujemy poprawny adres i logujemy na istniejące konto.
 */
export function resolveMedusaAdminEmail(email: string): string {
	const normalized = email.trim().toLowerCase();
	if (normalized === "lumine.strona@gmail.com") {
		return "lumie.strona@gmail.com";
	}
	return email.trim();
}

/** Logowanie email/hasło → token JWT admina Medusa. */
export async function loginWithEmailPassword(email: string, password: string): Promise<string> {
	const resolvedEmail = resolveMedusaAdminEmail(email);
	const res = await fetch(`${serverEnv.medusaBackendUrl}/auth/user/emailpass`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: resolvedEmail, password }),
		signal: AbortSignal.timeout(10_000),
	});

	if (res.status === 401) {
		throw new AdminUnauthorizedError("Nieprawidłowy email lub hasło.");
	}
	if (!res.ok) {
		const text = await res.text();
		throw new AdminApiError(extractMessage(text, "Logowanie nie powiodło się."), res.status);
	}

	const data = (await res.json()) as { token?: string };
	if (!data.token) throw new AdminApiError("Brak tokenu w odpowiedzi serwera.", 500);
	return data.token;
}

let cachedServiceToken: { token: string; at: number } | null = null;

/** Token z konta serwisowego (MEDUSA_ADMIN_*) — odczyt bez sesji panelu. Opcjonalny. */
async function getServiceToken(): Promise<string | null> {
	const email = serverEnv.adminEmail ? resolveMedusaAdminEmail(serverEnv.adminEmail) : undefined;
	const password = serverEnv.adminPassword;
	if (!email || !password) return null;

	if (cachedServiceToken && Date.now() - cachedServiceToken.at < 60 * 60 * 1000) {
		return cachedServiceToken.token;
	}

	try {
		const token = await loginWithEmailPassword(email, password);
		cachedServiceToken = { token, at: Date.now() };
		return token;
	} catch {
		return null;
	}
}

async function adminFetchWithToken<T>(
	token: string,
	path: string,
	init: AdminFetchInit = {},
): Promise<T> {
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${token}`);
	if (init.body) headers.set("Content-Type", "application/json");

	let lastError: AdminApiError | null = null;

	for (let attempt = 0; attempt < ADMIN_FETCH_RETRY_DELAYS_MS.length; attempt++) {
		const pause = ADMIN_FETCH_RETRY_DELAYS_MS[attempt] ?? 0;
		if (pause > 0) await sleep(pause);

		try {
			const shouldCache = (!init.method || init.method === "GET") && !init.body;

			const fetchInit = {
				...init,
				headers,
				cache: shouldCache ? ("force-cache" as const) : ("no-store" as const),
				next: shouldCache ? { revalidate: 60 } : undefined,
				signal: AbortSignal.timeout(ADMIN_FETCH_TIMEOUT_MS),
			} satisfies RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };

			const res = await fetch(
				`${serverEnv.medusaBackendUrl}${path}`,
				fetchInit,
			);

			if (res.status === 401) throw new AdminUnauthorizedError();
			if (!res.ok) {
				const text = await res.text();
				const error = new AdminApiError(extractMessage(text, `Błąd ${res.status}.`), res.status);
				if (TRANSIENT_ADMIN_STATUSES.has(res.status) && attempt < ADMIN_FETCH_RETRY_DELAYS_MS.length - 1) {
					lastError = error;
					continue;
				}
				throw error;
			}

			if (res.status === 204) return undefined as T;
			return (await res.json()) as T;
		} catch (error) {
			if (error instanceof AdminUnauthorizedError || error instanceof AdminApiError) {
				if (
					error instanceof AdminApiError &&
					TRANSIENT_ADMIN_STATUSES.has(error.status) &&
					attempt < ADMIN_FETCH_RETRY_DELAYS_MS.length - 1
				) {
					lastError = error;
					continue;
				}
				throw error;
			}

			if (attempt < ADMIN_FETCH_RETRY_DELAYS_MS.length - 1) {
				lastError = new AdminApiError("Backend Medusa nie odpowiada. Spróbuj ponownie za chwilę.", 502);
				continue;
			}

			throw lastError ?? new AdminApiError("Backend Medusa nie odpowiada. Spróbuj ponownie za chwilę.", 502);
		}
	}

	throw lastError ?? new AdminApiError("Backend Medusa nie odpowiada. Spróbuj ponownie za chwilę.", 502);
}

/** Wywołanie Admin API z tokenem z sesji panelu. Rzuca AdminUnauthorizedError przy 401. */
export async function adminFetch<T>(path: string, init: AdminFetchInit = {}): Promise<T> {
	const token = await getSessionToken();
	if (!token) throw new AdminUnauthorizedError();
	return adminFetchWithToken<T>(token, path, init);
}

/** Odczyt Admin API kontem serwisowym (bez sesji panelu). Zwraca null gdy brak konta/błąd. */
export async function serviceAdminFetch<T>(
	path: string,
	init: AdminFetchInit = {},
): Promise<T | null> {
	const token = await getServiceToken();
	if (!token) return null;
	try {
		return await adminFetchWithToken<T>(token, path, init);
	} catch {
		return null;
	}
}

/** Upload plików (multipart) — zwraca URL-e zapisane w Medusa. */
export async function adminUpload(files: File[]): Promise<string[]> {
	if (files.length === 0) return [];
	const token = await getSessionToken();
	if (!token) throw new AdminUnauthorizedError();

	const form = new FormData();
	for (const file of files) form.append("files", file);

	const res = await fetch(`${serverEnv.medusaBackendUrl}/admin/uploads`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
		signal: AbortSignal.timeout(30_000),
	});

	if (res.status === 401) throw new AdminUnauthorizedError();
	if (!res.ok) {
		const text = await res.text();
		throw new AdminApiError(extractMessage(text, "Upload nie powiódł się."), res.status);
	}

	const data = (await res.json()) as { files?: Array<{ url?: string }> };
	return (data.files ?? []).map((file) => file.url).filter((url): url is string => Boolean(url));
}

/** Upload plików kontem serwisowym (fallback CMS gdy brak sesji panelu). */
export async function serviceAdminUpload(files: File[]): Promise<string[]> {
	if (files.length === 0) return [];
	const token = await getServiceToken();
	if (!token) throw new AdminApiError("MEDUSA_UPLOAD_UNAVAILABLE", 503);

	const form = new FormData();
	for (const file of files) form.append("files", file);

	const res = await fetch(`${serverEnv.medusaBackendUrl}/admin/uploads`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
		signal: AbortSignal.timeout(30_000),
	});

	if (res.status === 401) throw new AdminUnauthorizedError();
	if (!res.ok) {
		const text = await res.text();
		throw new AdminApiError(extractMessage(text, "Upload nie powiódł się."), res.status);
	}

	const data = (await res.json()) as { files?: Array<{ url?: string }> };
	return (data.files ?? []).map((file) => file.url).filter((url): url is string => Boolean(url));
}
