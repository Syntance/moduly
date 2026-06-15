import { createHash, randomInt } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import {
	type AuthCookieConfig,
	type CookieAdapter,
	clearAuthCookieToken,
	setAuthCookieToken,
} from "./cookies";

export type CustomerOtpRecord = {
	codeHash: string;
	email: string;
	attempts: number;
	expiresAt: number;
};

export type CustomerOtpStore = {
	get(key: string): Promise<CustomerOtpRecord | undefined> | CustomerOtpRecord | undefined;
	set(
		key: string,
		value: CustomerOtpRecord,
		ttlMs: number,
	): Promise<void> | void;
	delete(key: string): Promise<void> | void;
};

export type CustomerOtpConfig = AuthCookieConfig & {
	jwtSecret: string;
	otpTtlMs?: number;
	maxAttempts?: number;
	sessionTtlMs?: number;
	issuer?: string;
};

export type CustomerSession = {
	email: string;
	expiresAt: number;
};

const DEFAULT_OTP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CUSTOMER_COOKIE_DEFAULT = "customer_session";

function hashOtp(code: string): string {
	return createHash("sha256").update(code).digest("hex");
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function otpStorageKey(email: string): string {
	return `customer-otp:${normalizeEmail(email)}`;
}

function getSecretKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

/** Generuje 6-cyfrowy kod OTP. */
export function generateCustomerOtpCode(): string {
	return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** In-memory store OTP — single-instance / dev. */
export function createMemoryCustomerOtpStore(): CustomerOtpStore {
	const records = new Map<string, CustomerOtpRecord>();
	const timers = new Map<string, ReturnType<typeof setTimeout>>();

	return {
		get(key: string) {
			return records.get(key);
		},
		set(key: string, value: CustomerOtpRecord, ttlMs: number) {
			records.set(key, value);
			const existingTimer = timers.get(key);
			if (existingTimer) clearTimeout(existingTimer);
			timers.set(
				key,
				setTimeout(() => {
					records.delete(key);
					timers.delete(key);
				}, ttlMs),
			);
		},
		delete(key: string) {
			records.delete(key);
			const timer = timers.get(key);
			if (timer) {
				clearTimeout(timer);
				timers.delete(key);
			}
		},
	};
}

/** Panel klienta — OTP e-mail + sesja JWT w httpOnly cookie. */
export class CustomerOtpAuth {
	constructor(
		private readonly config: CustomerOtpConfig,
		private readonly store: CustomerOtpStore,
	) {}

	private get otpTtlMs(): number {
		return this.config.otpTtlMs ?? DEFAULT_OTP_TTL_MS;
	}

	private get maxAttempts(): number {
		return this.config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	}

	private get sessionTtlMs(): number {
		return this.config.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
	}

	private get cookieName(): string {
		return this.config.cookieName ?? CUSTOMER_COOKIE_DEFAULT;
	}

	/** Zapisuje zhashowany OTP z TTL. Zwraca kod do wysyłki mailem. */
	async createOtp(email: string): Promise<string> {
		const normalized = normalizeEmail(email);
		const code = generateCustomerOtpCode();
		const record: CustomerOtpRecord = {
			codeHash: hashOtp(code),
			email: normalized,
			attempts: 0,
			expiresAt: Date.now() + this.otpTtlMs,
		};

		await this.store.set(otpStorageKey(normalized), record, this.otpTtlMs);
		return code;
	}

	/** Weryfikuje OTP i wystawia sesję klienta w cookie. */
	async verifyOtpAndIssueSession(
		email: string,
		code: string,
		cookies: CookieAdapter,
	): Promise<CustomerSession> {
		const normalized = normalizeEmail(email);
		const key = otpStorageKey(normalized);
		const record = await this.store.get(key);

		if (!record || record.expiresAt <= Date.now()) {
			await this.store.delete(key);
			throw new Error("Kod wygasł. Poproś o nowy kod.");
		}

		if (record.attempts >= this.maxAttempts) {
			await this.store.delete(key);
			throw new Error("Zbyt wiele prób. Poproś o nowy kod.");
		}

		if (record.codeHash !== hashOtp(code.trim())) {
			record.attempts += 1;
			await this.store.set(key, record, record.expiresAt - Date.now());
			throw new Error("Nieprawidłowy kod. Sprawdź wiadomość e-mail.");
		}

		await this.store.delete(key);

		const token = await this.issueSessionToken(normalized);
		await setAuthCookieToken(
			cookies,
			{ ...this.config, cookieName: this.cookieName },
			token,
		);

		return {
			email: normalized,
			expiresAt: Date.now() + this.sessionTtlMs,
		};
	}

	async validateCustomerSession(
		cookies: CookieAdapter,
	): Promise<CustomerSession | null> {
		const token = await cookies.get(this.cookieName);
		if (!token) return null;

		try {
			const { payload } = await jwtVerify(
				token,
				getSecretKey(this.config.jwtSecret),
				{ issuer: this.config.issuer ?? "moduly-customer" },
			);

			const email =
				typeof payload.email === "string"
					? normalizeEmail(payload.email)
					: null;
			const exp = typeof payload.exp === "number" ? payload.exp : null;

			if (!email || !exp) return null;

			return {
				email,
				expiresAt: exp * 1000,
			};
		} catch {
			return null;
		}
	}

	async logoutCustomer(cookies: CookieAdapter): Promise<void> {
		await clearAuthCookieToken(cookies, this.cookieName);
	}

	private async issueSessionToken(email: string): Promise<string> {
		const expiresAtSec = Math.floor(
			(Date.now() + this.sessionTtlMs) / 1000,
		);

		return new SignJWT({ email })
			.setProtectedHeader({ alg: "HS256" })
			.setSubject(email)
			.setIssuedAt()
			.setExpirationTime(expiresAtSec)
			.setIssuer(this.config.issuer ?? "moduly-customer")
			.sign(getSecretKey(this.config.jwtSecret));
	}
}
