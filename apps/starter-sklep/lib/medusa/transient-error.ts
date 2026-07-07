import { FetchError } from "@medusajs/js-sdk";

/** Przerwany fetch (React Strict Mode, nawigacja) — nie logujemy jako błąd koszyka. */
export function isAbortedFetchError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  return e instanceof Error && e.name === "AbortError";
}

/** 502/503/504, Railway „Application failed to respond”, chwilowy brak sieci, itd. */
export function isTransientMedusaError(e: unknown): boolean {
  if (isAbortedFetchError(e)) {
    return true;
  }
  if (e instanceof TypeError && e.message === "Failed to fetch") {
    return true;
  }
  if (e instanceof FetchError) {
    const s = e.status;
    return s === 502 || s === 503 || s === 504;
  }
  if (e instanceof Error) {
    return /Application failed to respond|502|503|504|Bad Gateway|Service Unavailable|Gateway Timeout|Failed to fetch/i.test(
      e.message,
    );
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** `next build` — przy 502 nie przerywamy deployu; strony ISR odświeżą się po starcie Medusy. */
export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}
