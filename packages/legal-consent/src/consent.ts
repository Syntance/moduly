/**
 * Lekki mechanizm zgód (własny baner — bez CookieYes / OneTrust).
 *
 * - Zgoda trzymana w localStorage pod kluczem wersjonowanym.
 * - Zmiany ogłaszane globalnie przez `CONSENT_EVENT` (CustomEvent).
 * - Do ponownego otwarcia banera — `CONSENT_OPEN_EVENT`.
 */

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
	/** Zawsze true — pliki niezbędne (koszyk, sesja). */
	necessary: true;
	/** Analityka (np. PostHog). */
	analytics: boolean;
	/** Marketing (np. Meta Pixel). */
	marketing: boolean;
	/** ISO timestamp ostatniej decyzji. */
	updatedAt: number;
	/** Wersja schematu — przy zmianie kategorii odświeża baner. */
	version: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "moduly:consent-update";
export const CONSENT_OPEN_EVENT = "moduly:consent-open";

const DEFAULT_STORAGE_KEY = "moduly.consent.v1";

export type ConsentStorageOptions = {
	storageKey?: string;
	version?: number;
};

function resolveStorageKey(options?: ConsentStorageOptions): string {
	return options?.storageKey ?? DEFAULT_STORAGE_KEY;
}

function resolveVersion(options?: ConsentStorageOptions): number {
	return options?.version ?? CONSENT_VERSION;
}

function isBrowser(): boolean {
	return typeof window !== "undefined";
}

export function getConsent(options?: ConsentStorageOptions): ConsentState | null {
	if (!isBrowser()) return null;

	const version = resolveVersion(options);
	const storageKey = resolveStorageKey(options);

	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ConsentState;
		if (parsed.version !== version) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function hasConsentDecision(options?: ConsentStorageOptions): boolean {
	return getConsent(options) !== null;
}

export function saveConsent(
	input: { analytics: boolean; marketing: boolean },
	options?: ConsentStorageOptions,
): ConsentState {
	const version = resolveVersion(options);
	const storageKey = resolveStorageKey(options);

	const state: ConsentState = {
		necessary: true,
		analytics: input.analytics,
		marketing: input.marketing,
		updatedAt: Date.now(),
		version,
	};

	if (isBrowser()) {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(state));
		} catch {
			/* prywatny tryb / quota — pomijamy */
		}
		window.dispatchEvent(
			new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state }),
		);
	}

	return state;
}

/** Utility dla wywołań z JSX (np. link „Ustawienia cookies”). */
export function openConsentBanner(): void {
	if (!isBrowser()) return;
	window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

export function isAnalyticsEnabled(state: ConsentState | null): boolean {
	return !!state?.analytics;
}

export function isMarketingEnabled(state: ConsentState | null): boolean {
	return !!state?.marketing;
}
