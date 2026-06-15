export type CookieSetOptions = {
	httpOnly: boolean;
	secure: boolean;
	sameSite: "lax" | "strict" | "none";
	path: string;
	maxAge: number;
};

/** Abstrakcja cookie — implementacja w Next.js (`cookies()`) lub testach. */
export type CookieAdapter = {
	get(name: string): string | undefined | Promise<string | undefined>;
	set(name: string, value: string, options: CookieSetOptions): void | Promise<void>;
	delete(name: string): void | Promise<void>;
};

export type AuthCookieConfig = {
	cookieName: string;
	maxAgeSeconds?: number;
	secure?: boolean;
};

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

export async function getAuthCookieToken(
	cookies: CookieAdapter,
	cookieName: string,
): Promise<string | null> {
	const value = await cookies.get(cookieName);
	return value ?? null;
}

export async function setAuthCookieToken(
	cookies: CookieAdapter,
	config: AuthCookieConfig,
	token: string,
): Promise<void> {
	await cookies.set(config.cookieName, token, {
		httpOnly: true,
		secure: config.secure ?? process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: config.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS,
	});
}

export async function clearAuthCookieToken(
	cookies: CookieAdapter,
	cookieName: string,
): Promise<void> {
	await cookies.delete(cookieName);
}
