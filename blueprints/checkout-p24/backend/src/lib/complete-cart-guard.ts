/**
 * Strażnik finalizacji koszyka — czysta logika decyzji, testowalna bez Medusy.
 *
 * Kontekst (incydent #10165): `completeCartWorkflow` Medusy tworzy zamówienie
 * PRZED autoryzacją płatności i przy nieudanej autoryzacji polega na
 * kompensacji (usunięciu zamówienia). Gdy kompensację przerwie restart/deploy,
 * w bazie zostaje zamówienie `not_paid` bez płatności. Ten strażnik działa w
 * hooku `validate` (przed WSZYSTKIMI krokami workflow) i blokuje finalizację,
 * dopóki płatność nie jest realnie potwierdzona — zamówienie bez pieniędzy
 * nie ma prawa powstać, niezależnie od restartów.
 *
 * Zasady:
 *  - przelew tradycyjny (`pp_system_default`) jest WYŁĄCZONY — jedyna płatność
 *    to Przelewy24 (decyzja biznesowa po incydencie),
 *  - sesja P24 przepuszcza tylko gdy: webhook już ją potwierdził
 *    (`data.status === "verified"`) albo P24 API potwierdza wpłatę
 *    (status 1 = wpłacone, czeka na verify; 2 = rozliczone),
 *  - brak potwierdzenia / brak transakcji w P24 / P24 API niedostępne →
 *    blokada (`payment_authorization_error` — storefront pokazuje „pending”,
 *    cron reconcile domknie koszyk, gdy wpłata się pojawi).
 */

import {
  P24_STATUS_PAID,
  P24_STATUS_VERIFY,
} from "./p24-transaction-api";
import { PRZELEWY24_PROVIDER_ID } from "./p24-reconcile";
import { SYSTEM_PAYMENT_PROVIDER_ID } from "./order-payment-method";

/** Statusy sesji, które Medusa uznaje za przetwarzalne przy completeCart. */
const PROCESSABLE_SESSION_STATUSES = new Set([
  "pending",
  "requires_more",
  "authorized",
  "captured",
]);

export type GuardSession = {
  id?: string | null;
  provider_id?: string | null;
  status?: string | null;
  data?: Record<string, unknown> | null;
};

export type GuardDecision =
  | { allow: true; reason: string }
  | { allow: false; reason: string; message: string };

export type GuardCartSnapshot = {
  completed_at?: string | Date | null;
  total?: number | string | null;
  payment_sessions: GuardSession[];
};

/** Odpytuje P24 o stan transakcji — wstrzykiwane, żeby dało się testować. */
export type P24StatusProbe = (
  p24SessionId: string,
) => Promise<{ status: number } | null>;

export type GuardOptions = {
  /**
   * Przelew tradycyjny (`pp_system_default`) dozwolony tylko gdy P24 nie jest
   * w ogóle skonfigurowane (dev/test) albo świadomie włączony flagą
   * `FEATURE_BANK_TRANSFER=1`. Na produkcji z P24: zawsze `false`.
   */
  bankTransferAllowed: boolean;
};

function sessionP24Data(session: GuardSession): {
  p24SessionId: string | null;
  verified: boolean;
} {
  const data = session.data ?? {};
  const raw = data.p24_session_id;
  return {
    p24SessionId: typeof raw === "string" && raw.trim() ? raw.trim() : null,
    verified: data.status === "verified",
  };
}

export async function evaluateCartCompletionGuard(
  cart: GuardCartSnapshot,
  probeP24Status: P24StatusProbe,
  options: GuardOptions,
): Promise<GuardDecision> {
  // Koszyk już domknięty — workflow tylko zwróci istniejące zamówienie,
  // niczego nie tworzy. Blokada dawałaby klientowi błąd zamiast potwierdzenia.
  if (cart.completed_at) {
    return { allow: true, reason: "cart_already_completed" };
  }

  // Koszyk darmowy (100% rabat) — Medusa pomija płatność.
  const total = Number(cart.total ?? 0);
  if (Number.isFinite(total) && total <= 0) {
    return { allow: true, reason: "free_cart" };
  }

  const processable = cart.payment_sessions.filter((s) =>
    PROCESSABLE_SESSION_STATUSES.has((s.status ?? "").trim()),
  );

  // Brak sesji — przepuszczamy do walidacji Medusy (rzuci czytelny
  // INVALID_DATA "Payment sessions are required to complete cart").
  if (processable.length === 0) {
    return { allow: true, reason: "no_sessions_defer_to_medusa" };
  }

  // Płatność już autoryzowana/przechwycona (np. webhook wyprzedził klienta).
  if (processable.some((s) => s.status === "authorized" || s.status === "captured")) {
    return { allow: true, reason: "session_already_authorized" };
  }

  // Przelew tradycyjny poza P24 — wyłączony (chyba że dev/test lub flaga).
  if (processable.some((s) => s.provider_id === SYSTEM_PAYMENT_PROVIDER_ID)) {
    if (options.bankTransferAllowed) {
      return { allow: true, reason: "bank_transfer_explicitly_allowed" };
    }
    return {
      allow: false,
      reason: "bank_transfer_disabled",
      message:
        "Przelew tradycyjny nie jest dostępny — dokończ płatność przez Przelewy24.",
    };
  }

  const p24Sessions = processable.filter(
    (s) => s.provider_id === PRZELEWY24_PROVIDER_ID,
  );

  // Nieznany provider (nie P24, nie system) — nie przepuszczamy w ciemno.
  // Dodanie nowego providera płatności wymaga świadomej aktualizacji strażnika.
  if (p24Sessions.length === 0) {
    return {
      allow: false,
      reason: "unknown_provider",
      message:
        "Wybrana metoda płatności nie jest obsługiwana. Wybierz płatność Przelewy24.",
    };
  }

  for (const session of p24Sessions) {
    const { p24SessionId, verified } = sessionP24Data(session);

    // Webhook P24 już potwierdził wpłatę (transaction/verify wykonany).
    if (verified) {
      return { allow: true, reason: "p24_session_verified" };
    }

    if (!p24SessionId) continue;

    const tx = await probeP24Status(p24SessionId);
    if (
      tx &&
      (tx.status === P24_STATUS_VERIFY || tx.status === P24_STATUS_PAID)
    ) {
      // Wpłata jest w P24 (1 = czeka na verify, 2 = rozliczona) —
      // krok autoryzacji workflow wykona verify i domknie płatność.
      return { allow: true, reason: `p24_paid_status_${tx.status}` };
    }
  }

  // Brak wpłaty w P24 (status 0 / brak transakcji / API niedostępne).
  return {
    allow: false,
    reason: "p24_payment_not_confirmed",
    message:
      "Płatność nie została jeszcze potwierdzona przez Przelewy24. " +
      "Jeśli zapłaciłeś, zamówienie utworzy się automatycznie po zaksięgowaniu wpłaty.",
  };
}
