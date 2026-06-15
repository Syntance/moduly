import type { AuthProvider, AuthSession } from "@moduly/types";
import { isAdminEmailAllowed } from "./allowlist";
import {
	type AuthCookieConfig,
	type CookieAdapter,
	clearAuthCookieToken,
	getAuthCookieToken,
	setAuthCookieToken,
} from "./cookies";

export type MedusaAuthConfig = AuthCookieConfig & {
	backendUrl: string;
	fetchTimeoutMs?: number;
};

type MedusaLoginResponse = {
	token?: string;
};

type MedusaMeResponse = {
	user?: {
		email?: string;
	};
};

const DEFAULT_TIMEOUT_MS = 10_000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Uwierzytelnianie administratora przez Medusa Admin API. */
export class MedusaAuth implements AuthProvider {
	constructor(private readonly config: MedusaAuthConfig) {}

	private get timeoutMs(): number {
		return this.config.fetchTimeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	async authenticate(
		email: string,
		password: string,
	): Promise<AuthSession | null> {
		const res = await fetch(
			`${this.config.backendUrl}/auth/user/emailpass`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim(), password }),
				signal: AbortSignal.timeout(this.timeoutMs),
			},
		);

		if (res.status === 401) {
			return null;
		}

		if (!res.ok) {
			throw new Error("Logowanie nie powiodło się. Spróbuj ponownie.");
		}

		const data = (await res.json()) as MedusaLoginResponse;
		if (!data.token) {
			throw new Error("Brak tokenu w odpowiedzi serwera.");
		}

		const session = await this.validateSession(data.token);
		if (!session) {
			return null;
		}

		if (!isAdminEmailAllowed(session.email)) {
			throw new Error("Konto nie ma dostępu do panelu.");
		}

		return session;
	}

	async validateSession(token: string): Promise<AuthSession | null> {
		const res = await fetch(
			`${this.config.backendUrl}/admin/users/me?fields=id,email`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(this.timeoutMs),
			},
		);

		if (res.status === 401) {
			return null;
		}

		if (!res.ok) {
			return null;
		}

		const data = (await res.json()) as MedusaMeResponse;
		const email = data.user?.email?.trim();
		if (!email) {
			return null;
		}

		return {
			email,
			expiresAt: Date.now() + SESSION_TTL_MS,
		};
	}

	async logout(_token: string): Promise<void> {
		// Medusa JWT nie wymaga server-side revoke — cookie czyści warstwa HTTP.
	}

	async getSessionEmail(token: string): Promise<string | null> {
		const session = await this.validateSession(token);
		return session?.email ?? null;
	}

	/** Loguje i zapisuje JWT w httpOnly cookie. */
	async loginWithCookie(
		email: string,
		password: string,
		cookies: CookieAdapter,
	): Promise<AuthSession> {
		const res = await fetch(
			`${this.config.backendUrl}/auth/user/emailpass`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim(), password }),
				signal: AbortSignal.timeout(this.timeoutMs),
			},
		);

		if (res.status === 401) {
			throw new Error("Nieprawidłowy email lub hasło.");
		}

		if (!res.ok) {
			throw new Error("Logowanie nie powiodło się. Spróbuj ponownie.");
		}

		const data = (await res.json()) as MedusaLoginResponse;
		if (!data.token) {
			throw new Error("Brak tokenu w odpowiedzi serwera.");
		}

		const session = await this.validateSession(data.token);
		if (!session) {
			throw new Error("Nie udało się zweryfikować sesji.");
		}

		if (!isAdminEmailAllowed(session.email)) {
			throw new Error("Konto nie ma dostępu do panelu.");
		}

		await setAuthCookieToken(cookies, this.config, data.token);
		return session;
	}

	/** Weryfikuje sesję z httpOnly cookie. */
	async validateCookieSession(
		cookies: CookieAdapter,
	): Promise<AuthSession | null> {
		const token = await getAuthCookieToken(cookies, this.config.cookieName);
		if (!token) return null;

		const session = await this.validateSession(token);
		if (!session) return null;

		if (!isAdminEmailAllowed(session.email)) {
			return null;
		}

		return session;
	}

	/** Wylogowuje — czyści cookie sesji admina. */
	async logoutCookie(cookies: CookieAdapter): Promise<void> {
		await clearAuthCookieToken(cookies, this.config.cookieName);
	}
}
