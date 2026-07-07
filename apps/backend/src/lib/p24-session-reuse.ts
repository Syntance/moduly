/**
 * Decyzja o sesji P24 przy `prepare-checkout` — server-side odpowiednik guardu
 * kwoty z `findReusableP24RedirectUrl` (storefront).
 *
 * Kontekst (audyt 06.07.2026): sesja P24 rejestruje transakcję na SZTYWNĄ
 * kwotę. Gdy klient zmieni koszyk (dostawa, rabat, express) po rejestracji,
 * stary `redirect_url` prowadzi do transakcji na STARĄ kwotę. Klient płaci
 * starą kwotę, `confirmFromP24` odmawia (niezgodność kwot) i wpłata wisi
 * „do wykorzystania" bez zamówienia. Storefront ma guard kwoty, ale serwer
 * musi go wymuszać niezależnie (storefront bywa ominięty: stare taby,
 * linki retry, klienci API).
 */

import { AMOUNT_EPSILON_PLN } from "./express-fee";

export type P24SessionSnapshot = {
  status?: string | null;
  amount?: number | string | null;
  data?: Record<string, unknown> | null;
};

export type P24SessionPlan =
  /** Brak sesji providera — utwórz nową. */
  | "create"
  /** Sesja aktualna (pending, zgodna kwota) albo już rozliczana — nie ruszaj. */
  | "reuse"
  /** Sesja pending na złą kwotę — przerejestruj (po sprawdzeniu wpłaty w P24). */
  | "recreate";

function toAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function p24SessionAmountMatches(
  sessionAmount: number | string | null | undefined,
  collectionAmount: number | string | null | undefined,
): boolean {
  const session = toAmount(sessionAmount);
  const collection = toAmount(collectionAmount);
  // Brak którejkolwiek kwoty = nie umiemy stwierdzić rozjazdu — nie niszczymy
  // sesji na podstawie niepełnych danych (provider i tak odmówi verify przy
  // realnej niezgodności).
  if (session === null || collection === null) return true;
  return Math.abs(session - collection) <= AMOUNT_EPSILON_PLN;
}

export function planP24SessionForCheckout(params: {
  session: P24SessionSnapshot | null | undefined;
  collectionAmount: number | string | null | undefined;
}): P24SessionPlan {
  const session = params.session;
  if (!session) return "create";

  // Sesje authorized/captured są już w obiegu rozliczeniowym — nie wolno ich
  // kasować; completeCart obsłuży je wprost.
  const status = (session.status ?? "pending").trim();
  if (status !== "pending") return "reuse";

  if (p24SessionAmountMatches(session.amount, params.collectionAmount)) {
    return "reuse";
  }
  return "recreate";
}

/** p24_session_id z surowych danych sesji (do sondy statusu przed recreate). */
export function p24SessionIdFromData(
  data: Record<string, unknown> | null | undefined,
): string | null {
  const raw = data?.p24_session_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
