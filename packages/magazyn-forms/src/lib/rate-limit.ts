type Bucket = { count: number; resetAt: number };

const BUCKETS = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/** In-memory limiter — miękki limit w serverless; w prod. rozważ Redis. */
export function rateLimit(
	key: string,
	limit: number,
	windowMs: number,
): RateLimitResult {
	const now = Date.now();
	const existing = BUCKETS.get(key);
	if (!existing || existing.resetAt <= now) {
		BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
		return { ok: true, retryAfterSec: 0 };
	}
	if (existing.count >= limit) {
		return {
			ok: false,
			retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
		};
	}
	existing.count += 1;
	return { ok: true, retryAfterSec: 0 };
}
