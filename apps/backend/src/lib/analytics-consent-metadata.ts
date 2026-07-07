/**
 * Snapshot zgód analitycznych + identyfikatory PostHog w metadata zamówienia.
 *
 * RODO/PrivacyNote: storefront zapisuje stan zgody (analytics/marketing) oraz
 * PostHog distinct_id/session_id do cart.metadata w `prepare-checkout` (PRZED
 * completeCart). Medusa kopiuje cart.metadata → order.metadata przy domknięciu,
 * więc subscriber `order.placed` widzi snapshot bez race condition.
 *
 * Subscriber bramkuje server-side eventy:
 *   - Meta CAPI wysyłane TYLKO gdy `marketing === true` (Meta to współadministrator
 *     danych reklamowych — w EU/PL wymagana zgoda, nie legitimate interest),
 *   - PostHog capture TYLKO gdy `analytics === true`, z odtworzonym distinct_id
 *     (spójność lejka begin_checkout → purchase jako jedna osoba).
 */

export const ANALYTICS_CONSENT_KEYS = {
  analytics: "consent_analytics",
  marketing: "consent_marketing",
  phDistinctId: "ph_distinct_id",
  phSessionId: "ph_session_id",
} as const;

export interface AnalyticsConsentSnapshot {
  /** Zgoda na analitykę (PostHog). null = brak decyzji w snapshocie. */
  analytics: boolean | null;
  /** Zgoda marketingowa (Meta CAPI). null = brak decyzji w snapshocie. */
  marketing: boolean | null;
  phDistinctId?: string;
  phSessionId?: string;
}

export interface AnalyticsConsentInput {
  analytics?: boolean;
  marketing?: boolean;
  phDistinctId?: string;
  phSessionId?: string;
}

/**
 * Buduje patch metadata ze stanu zgód. Wartości jako stringi ("1"/"0"),
 * bo metadata trzymamy płasko i serializowalnie.
 */
export function buildAnalyticsConsentPatch(
  input: AnalyticsConsentInput,
): Record<string, string> {
  const patch: Record<string, string> = {};

  if (typeof input.analytics === "boolean") {
    patch[ANALYTICS_CONSENT_KEYS.analytics] = input.analytics ? "1" : "0";
  }
  if (typeof input.marketing === "boolean") {
    patch[ANALYTICS_CONSENT_KEYS.marketing] = input.marketing ? "1" : "0";
  }

  const distinctId = input.phDistinctId?.trim();
  if (distinctId) patch[ANALYTICS_CONSENT_KEYS.phDistinctId] = distinctId;

  const sessionId = input.phSessionId?.trim();
  if (sessionId) patch[ANALYTICS_CONSENT_KEYS.phSessionId] = sessionId;

  return patch;
}

function parseBool(value: unknown): boolean | null {
  if (value === "1" || value === true) return true;
  if (value === "0" || value === false) return false;
  return null;
}

/**
 * Odczytuje snapshot z order.metadata. Gdy brak kluczy zgody → null
 * (subscriber traktuje brak decyzji jako brak zgody — fail-closed).
 */
export function readAnalyticsConsent(
  order: { metadata?: Record<string, unknown> | null } | null | undefined,
): AnalyticsConsentSnapshot {
  const meta = order?.metadata;
  if (!meta || typeof meta !== "object") {
    return { analytics: null, marketing: null };
  }

  const distinctId = meta[ANALYTICS_CONSENT_KEYS.phDistinctId];
  const sessionId = meta[ANALYTICS_CONSENT_KEYS.phSessionId];

  return {
    analytics: parseBool(meta[ANALYTICS_CONSENT_KEYS.analytics]),
    marketing: parseBool(meta[ANALYTICS_CONSENT_KEYS.marketing]),
    phDistinctId: typeof distinctId === "string" ? distinctId : undefined,
    phSessionId: typeof sessionId === "string" ? sessionId : undefined,
  };
}
