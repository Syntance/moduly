import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import Redis from "ioredis"

/**
 * GET /health — liveness/readiness dla Railway/monitoringu.
 *
 * Sprawdza:
 *  - Postgres: `SELECT 1` (krytyczne → 503 gdy pada),
 *  - Redis: PING (informacyjnie — brak/awaria nie wywala healthcheck, bo
 *    Medusa degraduje do in-memory; sygnalizujemy `degraded` w statusie Redis).
 *
 * Endpoint publiczny (poza /admin i /store) — bez auth.
 */

let healthRedis: Redis | null = null
let healthRedisResolved = false

function getHealthRedis(): Redis | null {
  if (healthRedisResolved) return healthRedis
  healthRedisResolved = true
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null
  healthRedis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  })
  // Bez handlera 'error' ioredis rzuca unhandled — łapiemy i ignorujemy (zgłosi się w PING).
  healthRedis.on("error", () => {})
  return healthRedis
}

async function pingRedis(): Promise<"ok" | "error" | "not_configured"> {
  const client = getHealthRedis()
  if (!client) return "not_configured"
  try {
    if (client.status !== "ready") {
      await client.connect().catch(() => undefined)
    }
    const pong = await client.ping()
    return pong === "PONG" ? "ok" : "error"
  } catch {
    return "error"
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const checks: Record<string, string> = {}

  let dbOk = false
  try {
    const knex = req.scope.resolve(
      ContainerRegistrationKeys.PG_CONNECTION,
    ) as { raw: (sql: string) => Promise<unknown> }
    await knex.raw("SELECT 1")
    checks.database = "ok"
    dbOk = true
  } catch {
    checks.database = "error"
  }

  checks.redis = await pingRedis()

  const status = dbOk ? "ok" : "degraded"
  res.status(dbOk ? 200 : 503).json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  })
}
