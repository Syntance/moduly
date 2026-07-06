/**
 * Lekki mechanizm zgód (własny baner — bez CookieYes / OneTrust).
 *
 * - Zgoda trzymana w localStorage pod kluczem `STORAGE_KEY` (wersjonowana).
 * - Zmiany ogłaszane globalnie przez `CONSENT_EVENT` (CustomEvent).
 * - Do ponownego otwarcia banera — `CONSENT_OPEN_EVENT`
 *   (np. z linku „Ustawienia cookies” w stopce: dispatchEvent).
 */

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  /** Zawsze true — pliki niezbędne (koszyk, sesja). */
  necessary: true;
  /** PostHog + Meta PageView. */
  analytics: boolean;
  /** Meta Pixel (remarketing) — tu ta sama kategoria co analytics w obecnej integracji. */
  marketing: boolean;
  /** ISO timestamp ostatniej decyzji. */
  updatedAt: number;
  /** Wersja schematu, gdy zmienimy kategorie — odświeży baner. */
  version: number;
}

export const CONSENT_VERSION = 1;
const STORAGE_KEY = "moduly.consent.v1";
export const CONSENT_EVENT = "moduly:consent-update";
export const CONSENT_OPEN_EVENT = "moduly:consent-open";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getConsent(): ConsentState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsentDecision(): boolean {
  return getConsent() !== null;
}

export function saveConsent(
  input: { analytics: boolean; marketing: boolean },
): ConsentState {
  const state: ConsentState = {
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    updatedAt: Date.now(),
    version: CONSENT_VERSION,
  };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* prywatny tryb / quota — pomijamy */
    }
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state }));
  }
  return state;
}

/** Utility dla wywołań z JSX (np. link „Ustawienia cookies”). */
export function openConsentBanner(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

/** Czy któraś z kategorii marketingowych/analitycznych jest zaakceptowana. */
export function isAnalyticsEnabled(state: ConsentState | null): boolean {
  return !!state?.analytics;
}

export function isMarketingEnabled(state: ConsentState | null): boolean {
  return !!state?.marketing;
}
