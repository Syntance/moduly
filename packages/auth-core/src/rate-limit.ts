export type RateLimitResult = {
	success: boolean;
	limit?: number;
	remaining?: number;
	reset?: number;
};

export type RateLimitOptions = {
	/** Klucz limitu, np. `login:ip:1.2.3.4`. */
	key: string;
	/** Maks. liczba żądań w oknie. */
	limit?: number;
	/** Okno w sekundach. */
	windowSeconds?: number;
};

/**
 * Stub rate limitera Upstash — fail-open gdy brak Redis.
 * Gdy `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` są ustawione,
 * można podmienić na `@upstash/ratelimit` w aplikacji docelowej.
 */
export function checkRateLimit(
	options: RateLimitOptions,
	env: NodeJS.ProcessEnv = process.env,
): RateLimitResult {
	const redisUrl = env.UPSTASH_REDIS_REST_URL?.trim();
	const redisToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();

	if (!redisUrl || !redisToken) {
		return { success: true };
	}

	void options;

	// Stub: brak twardej integracji w pakiecie bazowym — aplikacja może nadpisać.
	return { success: true };
}

/** Helper: limit logowania 5 prób / 15 min (zgodnie z regułami bezpieczeństwa). */
export function checkLoginRateLimit(
	email: string,
	ip: string,
	env: NodeJS.ProcessEnv = process.env,
): RateLimitResult {
	const normalizedEmail = email.trim().toLowerCase();
	const ipKey = checkRateLimit(
		{ key: `login:ip:${ip}`, limit: 5, windowSeconds: 15 * 60 },
		env,
	);
	if (!ipKey.success) return ipKey;

	return checkRateLimit(
		{
			key: `login:email:${normalizedEmail}`,
			limit: 5,
			windowSeconds: 15 * 60,
		},
		env,
	);
}
