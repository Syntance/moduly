/**
 * Telemetria krytycznej ścieżki checkoutu (client-side Sentry).
 *
 * Cel: gdy coś pójdzie nie tak między bramką P24 a utworzeniem zamówienia,
 * w Sentry ma być zdarzenie z identyfikatorami (cart, status P24) — bez
 * grzebania w logach przeglądarki klienta. PII nie wysyłamy: wyłącznie ID
 * koszyka i statusy techniczne.
 */

import * as Sentry from "@sentry/nextjs";

export type CheckoutIncident =
  /** P24 potwierdziło wpłatę, ale completeCart się nie powiódł. */
  | "p24-paid-but-complete-failed"
  /** Polling zakończony bez rozstrzygnięcia — klient zobaczył "pending". */
  | "p24-return-pending-fallback"
  /** Klient zobaczył ekran "płatność nieudana". */
  | "p24-return-failed"
  /** Backend niedostępny podczas weryfikacji powrotu z P24. */
  | "p24-return-backend-unreachable";

const INCIDENT_LEVELS: Record<CheckoutIncident, Sentry.SeverityLevel> = {
  "p24-paid-but-complete-failed": "error",
  "p24-return-pending-fallback": "warning",
  "p24-return-failed": "info",
  "p24-return-backend-unreachable": "warning",
};

export function reportCheckoutIncident(
  incident: CheckoutIncident,
  context: {
    cart_id?: string | null;
    p24_status?: string | number | null;
    attempt?: number;
    detail?: string;
  } = {},
): void {
  try {
    Sentry.withScope((scope) => {
      scope.setLevel(INCIDENT_LEVELS[incident]);
      scope.setTag("checkout_incident", incident);
      scope.setContext("checkout", {
        cart_id: context.cart_id ?? undefined,
        p24_status: context.p24_status ?? undefined,
        attempt: context.attempt,
        detail: context.detail,
      });
      Sentry.captureMessage(`[checkout] ${incident}`);
    });
  } catch {
    // Telemetria nigdy nie może wywrócić checkoutu.
  }
}
