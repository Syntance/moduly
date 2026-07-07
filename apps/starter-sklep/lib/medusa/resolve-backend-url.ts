const LOCAL_BACKEND = "http://localhost:9000";
const LOCAL_HEALTH_TTL_MS = 15_000;

let localHealthCache: { ok: boolean; checkedAt: number } | null = null;

function configuredBackendUrl(): string {
  return (
    process.env.MEDUSA_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() ||
    LOCAL_BACKEND
  );
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function getPublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim() ||
    process.env.MEDUSA_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

async function isLocalBackendHealthy(): Promise<boolean> {
  const now = Date.now();
  if (
    localHealthCache &&
    now - localHealthCache.checkedAt < LOCAL_HEALTH_TTL_MS
  ) {
    return localHealthCache.ok;
  }

  try {
    const res = await fetch(`${LOCAL_BACKEND}/health`, {
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) {
      localHealthCache = { ok: false, checkedAt: now };
      return false;
    }

    const key = getPublishableKey();
    if (!key) {
      localHealthCache = { ok: true, checkedAt: now };
      return true;
    }

    const storeProbe = await fetch(`${LOCAL_BACKEND}/store/regions`, {
      headers: { "x-publishable-api-key": key },
      signal: AbortSignal.timeout(1500),
    });
    const ok = storeProbe.ok;
    localHealthCache = { ok, checkedAt: now };
    return ok;
  } catch {
    localHealthCache = { ok: false, checkedAt: now };
    return false;
  }
}

/**
 * URL upstream Medusy dla proxy / RSC / server fetch.
 *
 * W dev: gdy `localhost:9000` odpowiada, używamy go zamiast Railway z `.env`
 * (inaczej koszyk w przeglądarce losowo dostaje `TypeError: Failed to fetch`).
 * Wyłącz: `MEDUSA_PREFER_LOCAL=0`.
 */
export async function resolveMedusaBackendUrl(): Promise<string> {
  const configured = configuredBackendUrl();

  if (process.env.NODE_ENV !== "development") {
    return configured;
  }

  if (process.env.MEDUSA_PREFER_LOCAL === "0") {
    return configured;
  }

  if (isLocalhostUrl(configured)) {
    if (await isLocalBackendHealthy()) {
      return LOCAL_BACKEND;
    }
    return configured;
  }

  if (await isLocalBackendHealthy()) {
    return LOCAL_BACKEND;
  }

  return configured;
}

/** Sync fallback — bez health-checku (np. moduły ładowane na build time). */
export function getConfiguredMedusaBackendUrl(): string {
  return configuredBackendUrl();
}
