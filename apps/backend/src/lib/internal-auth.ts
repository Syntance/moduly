import type { MedusaRequest } from "@medusajs/framework/http";

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Wspólny sekret server-to-server dla wewnętrznych endpointów Medusy
 * (notify-*, order-email). Ten sam sekret, którego backend używa do wołania
 * storefrontowego `/api/internal/order-email` (patrz `order-email-dispatch.ts`).
 */
export function internalSecret(): string | undefined {
  return (
    trimEnv(process.env.ORDER_EMAIL_INTERNAL_SECRET) ??
    trimEnv(process.env.MEDUSA_REVALIDATE_SECRET)
  );
}

function readHeader(req: MedusaRequest, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.replace(/\r\n/g, "").trim();
}

/** Stałoczasowe porównanie sekretów (higiena — nie wyciekamy długości przez timing). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Weryfikuje nagłówek `x-order-email-secret` względem skonfigurowanego sekretu.
 *
 * Fail-closed: gdy sekret nie jest ustawiony w środowisku, zwraca `false`
 * (endpoint nie powinien być publicznie dostępny bez konfiguracji).
 */
export function hasValidInternalSecret(req: MedusaRequest): boolean {
  const expected = internalSecret();
  if (!expected) return false;
  const provided = readHeader(req, "x-order-email-secret");
  if (!provided) return false;
  return safeEqual(provided, expected);
}
