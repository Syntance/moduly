import { createHash, randomUUID } from "node:crypto";
import type { AuthProvider, AuthSession } from "@moduly/types";
import * as argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { isAdminEmailAllowed } from "./allowlist";
import {
	type AuthCookieConfig,
	type CookieAdapter,
	clearAuthCookieToken,
	getAuthCookieToken,
	setAuthCookieToken,
} from "./cookies";

export type AdminUserRecord = {
	id: string;
	email: string;
	passwordHash: string;
};

export type PostgresAuthRepository = {
	findAdminUserByEmail(email: string): Promise<AdminUserRecord | null>;
	insertAdminSession(input: {
		userId: string;
		tokenHash: string;
		expiresAt: string;
	}): Promise<void>;
	deleteAdminSession(tokenHash: string): Promise<void>;
	hasActiveAdminSession(tokenHash: string): Promise<boolean>;
};

export type PostgresAuthConfig = AuthCookieConfig & {
	jwtSecret: string;
	sessionTtlMs?: number;
	issuer?: string;
};

type AdminJwtPayload = {
	email: string;
	sub: string;
};

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function getSecretKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

/** Uwierzytelnianie administratora z tabeli `admin_users` (Argon2 + JWT). */
export class PostgresAuth implements AuthProvider {
	constructor(
		private readonly config: PostgresAuthConfig,
		private readonly repository: PostgresAuthRepository,
	) {}

	private get sessionTtlMs(): number {
		return this.config.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
	}

	async authenticate(
		email: string,
		password: string,
	): Promise<AuthSession | null> {
		const user = await this.repository.findAdminUserByEmail(
			email.trim().toLowerCase(),
		);
		if (!user) {
			return null;
		}

		const valid = await argon2.verify(user.passwordHash, password);
		if (!valid) {
			return null;
		}

		if (!isAdminEmailAllowed(user.email)) {
			throw new Error("Konto nie ma dostępu do panelu.");
		}

		return {
			email: user.email,
			expiresAt: Date.now() + this.sessionTtlMs,
		};
	}

	async validateSession(token: string): Promise<AuthSession | null> {
		const payload = await this.verifyToken(token);
		if (!payload) return null;

		const active = await this.repository.hasActiveAdminSession(
			hashToken(token),
		);
		if (!active) return null;

		if (!isAdminEmailAllowed(payload.email)) {
			return null;
		}

		return {
			email: payload.email,
			expiresAt: payload.expiresAt,
		};
	}

	async logout(token: string): Promise<void> {
		await this.repository.deleteAdminSession(hashToken(token));
	}

	async getSessionEmail(token: string): Promise<string | null> {
		const session = await this.validateSession(token);
		return session?.email ?? null;
	}

	/** Hashuje hasło Argon2id — helper do seedów i tworzenia adminów. */
	static async hashPassword(password: string): Promise<string> {
		return argon2.hash(password, { type: argon2.argon2id });
	}

	private async issueToken(userId: string, email: string): Promise<string> {
		const expiresAtSec = Math.floor(
			(Date.now() + this.sessionTtlMs) / 1000,
		);

		return new SignJWT({ email })
			.setProtectedHeader({ alg: "HS256" })
			.setSubject(userId)
			.setJti(randomUUID())
			.setIssuedAt()
			.setExpirationTime(expiresAtSec)
			.setIssuer(this.config.issuer ?? "moduly-auth")
			.sign(getSecretKey(this.config.jwtSecret));
	}

	private async verifyToken(
		token: string,
	): Promise<(AdminJwtPayload & { expiresAt: number }) | null> {
		try {
			const { payload } = await jwtVerify(token, getSecretKey(this.config.jwtSecret), {
				issuer: this.config.issuer ?? "moduly-auth",
			});

			const email = typeof payload.email === "string" ? payload.email : null;
			const sub = typeof payload.sub === "string" ? payload.sub : null;
			const exp = typeof payload.exp === "number" ? payload.exp : null;

			if (!email || !sub || !exp) {
				return null;
			}

			return {
				email,
				sub,
				expiresAt: exp * 1000,
			};
		} catch {
			return null;
		}
	}

	/** Loguje i zapisuje JWT w httpOnly cookie. */
	async loginWithCookie(
		email: string,
		password: string,
		cookies: CookieAdapter,
	): Promise<AuthSession> {
		const user = await this.repository.findAdminUserByEmail(
			email.trim().toLowerCase(),
		);
		if (!user) {
			throw new Error("Nieprawidłowy email lub hasło.");
		}

		const valid = await argon2.verify(user.passwordHash, password);
		if (!valid) {
			throw new Error("Nieprawidłowy email lub hasło.");
		}

		if (!isAdminEmailAllowed(user.email)) {
			throw new Error("Konto nie ma dostępu do panelu.");
		}

		const token = await this.issueToken(user.id, user.email);
		const expiresAt = new Date(Date.now() + this.sessionTtlMs).toISOString();

		await this.repository.insertAdminSession({
			userId: user.id,
			tokenHash: hashToken(token),
			expiresAt,
		});

		await setAuthCookieToken(cookies, this.config, token);

		return {
			email: user.email,
			expiresAt: new Date(expiresAt).getTime(),
		};
	}

	async validateCookieSession(
		cookies: CookieAdapter,
	): Promise<AuthSession | null> {
		const token = await getAuthCookieToken(cookies, this.config.cookieName);
		if (!token) return null;
		return this.validateSession(token);
	}

	async logoutCookie(cookies: CookieAdapter): Promise<void> {
		const token = await getAuthCookieToken(cookies, this.config.cookieName);
		if (token) {
			await this.logout(token);
		}
		await clearAuthCookieToken(cookies, this.config.cookieName);
	}
}
