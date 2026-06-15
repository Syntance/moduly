import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Współdzielony rate-limiter (Upstash Redis) dla wrażliwych endpointów store.
 *
 * Fail-open: gdy Upstash nie jest skonfigurowany (brak ENV), middleware
 * przepuszcza ruch — nie blokujemy sklepu przez brak konfiguracji. Reguła
 * ecom-core: NIGDY in-memory limiter (ginie przy restart/autoscale) — dlatego
 * wyłącznie Redis.
 */

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`

let redis: Redis | null = null
let redisResolved = false

function getRedis(): Redis | null {
  if (redisResolved) return redis
  redisResolved = true
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (url && token) {
    redis = new Redis({ url, token })
  }
  return redis
}

const limiters = new Map<string, Ratelimit>()

function getLimiter(prefix: string, limit: number, window: Duration): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  const cacheKey = `${prefix}:${limit}:${window}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix,
      analytics: false,
    })
    limiters.set(cacheKey, limiter)
  }
  return limiter
}

function clientIdentifier(req: MedusaRequest): string {
  const xff = req.headers["x-forwarded-for"]
  const fromXff = (typeof xff === "string" ? xff : xff?.[0])?.split(",")[0]?.trim()
  return fromXff || req.socket?.remoteAddress || "anonymous"
}

export type RateLimitOptions = {
  /** Prefiks kluczy w Redis (oddziela budżety per endpoint). */
  prefix: string
  /** Liczba żądań na okno. */
  limit: number
  /** Okno czasowe, np. "1 m". */
  window: Duration
}

/** Tworzy middleware Medusy egzekwujące limit per IP. */
export function createRateLimit(options: RateLimitOptions) {
  return async function rateLimitMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ): Promise<void> {
    const limiter = getLimiter(options.prefix, options.limit, options.window)
    if (!limiter) {
      // Brak Upstash → fail-open (nie blokujemy ruchu z powodu braku konfiguracji).
      next(); return;
    }

    try {
      const { success, limit, remaining, reset } = await limiter.limit(
        clientIdentifier(req),
      )
      res.setHeader("X-RateLimit-Limit", String(limit))
      res.setHeader("X-RateLimit-Remaining", String(remaining))
      res.setHeader("X-RateLimit-Reset", String(reset))

      if (!success) {
        res.status(429).json({
          error: "Za dużo żądań. Spróbuj ponownie za chwilę.",
          retryAfter: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
        })
        return
      }
    } catch {
      // Awaria Redis/Upstash nie może wywalić checkoutu — fail-open.
      next(); return;
    }

    next();
  }
}
