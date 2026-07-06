/**
 * Audit-trail checkoutu — strukturalne logi krytycznej ścieżki płatności.
 *
 * Cel: po każdym incydencie (zamówienie bez płatności, zgubiony webhook,
 * wysypany completeCart) w logach Railway ma być pełna sekwencja zdarzeń
 * z identyfikatorami — bez zgadywania „co się stało”. Wpisy mają wspólny
 * prefiks `[checkout-audit]`, więc filtrowanie to jeden grep.
 *
 * PII: logujemy WYŁĄCZNIE identyfikatory (cart/order/sesja) i statusy —
 * nigdy email, adres ani kwoty powiązane z nazwiskiem.
 */

import { captureMessage } from "./sentry";

type AuditLogger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

export type CheckoutAuditEvent =
  /** Próba finalizacji koszyka (hook validate w completeCartWorkflow). */
  | "complete-cart-attempt"
  /** Finalizacja zablokowana — płatność niepotwierdzona. */
  | "complete-cart-blocked"
  /** Finalizacja przepuszczona — płatność potwierdzona w P24. */
  | "complete-cart-allowed"
  /** TRIPWIRE: zamówienie powstało bez potwierdzonej płatności. */
  | "order-without-payment"
  /** Wynik autoryzacji P24 (provider). */
  | "p24-authorize-result";

function serialize(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
}

/** Wpis audytowy do logów procesu (Railway). */
export function auditLog(
  logger: AuditLogger,
  level: "info" | "warn" | "error",
  event: CheckoutAuditEvent,
  fields: Record<string, unknown>,
): void {
  logger[level](`[checkout-audit] ${event} ${serialize(fields)}`);
}

/**
 * TRIPWIRE — zamówienie istnieje, a płatność nie jest potwierdzona.
 * To jest klasa błędu #10165: alarmujemy w Sentry (error) natychmiast,
 * z kontekstem wystarczającym do diagnozy bez dostępu do bazy.
 */
export function alertOrderWithoutPayment(
  logger: AuditLogger,
  context: {
    order_id: string;
    display_id?: number | string | null;
    payment_status?: string | null;
    provider_ids?: string[];
    session_statuses?: string[];
  },
): void {
  auditLog(logger, "error", "order-without-payment", context);
  captureMessage(
    "[checkout-audit] zamówienie powstało bez potwierdzonej płatności",
    "error",
    { ...context, event: "order-without-payment" },
  );
}
