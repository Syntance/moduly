/**
 * Logika rekoncyliacji płatności Przelewy24 — czyste funkcje, testowalne bez Medusy.
 *
 * Wzorzec branżowy (Stripe/Shopify/Woo): webhook bramki jest głównym torem
 * domykania płatności, a cykliczna rekoncyliacja łapie wszystko, co webhook
 * zgubił (restart, firewall, deploy, opóźniona wpłata przelewem). Zamówienie
 * powstaje WYŁĄCZNIE gdy provider potwierdzi środki (authorizePayment robi
 * pull-based `transaction/verify` w P24) — cron nigdy nie tworzy zamówienia
 * „na kredyt”.
 */

export const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";

/** Okno rekoncyliacji — P24 trzyma nieopłacone transakcje do kilku dni. */
export const RECONCILE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Minimalny wiek sesji zanim cron jej dotknie. Świeże sesje obsługuje
 * storefront (strona powrotu) i webhook — nie chcemy ścigać się z klientem,
 * który właśnie wpisuje BLIKa.
 */
export const RECONCILE_MIN_AGE_MS = 5 * 60 * 1000;

/** Limit koszyków na jeden przebieg — chroni P24 API i workflow engine. */
export const RECONCILE_MAX_PER_RUN = 25;

export type P24SessionRow = {
  id?: string | null;
  provider_id?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  payment_collection_id?: string | null;
  /** Surowe dane sesji providera (m.in. `p24_session_id`). */
  data?: Record<string, unknown> | null;
};

function ageMs(createdAt: string | Date | null | undefined, now: number): number | null {
  if (!createdAt) return null;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return null;
  return now - t;
}

/**
 * Sesja kwalifikuje się do rekoncyliacji gdy:
 *  - należy do providera P24,
 *  - jest w stanie `pending` (authorized/captured obsłużyła już Medusa),
 *  - jest starsza niż MIN_AGE (klient mógł skończyć płacić sam),
 *  - mieści się w oknie (starsze transakcje P24 i tak wygasły).
 */
export function isReconcilableSession(
  row: P24SessionRow,
  now: number = Date.now(),
): boolean {
  if (row.provider_id !== PRZELEWY24_PROVIDER_ID) return false;
  if ((row.status ?? "pending") !== "pending") return false;
  if (!row.payment_collection_id) return false;
  const age = ageMs(row.created_at, now);
  if (age === null) return false;
  return age >= RECONCILE_MIN_AGE_MS && age <= RECONCILE_WINDOW_MS;
}

export type CompleteCartErrorKind =
  | "payment_pending"
  | "already_completed"
  | "error";

/**
 * Klasyfikuje błąd `completeCartWorkflow`:
 *  - `payment_pending` — provider nie potwierdził środków (normalny stan,
 *    autoryzacja rzuca `PAYMENT_AUTHORIZATION_ERROR` / "Payment authorization failed"),
 *  - `already_completed` — wyścig ze storefrontem / webhookiem (też OK),
 *  - `error` — realny problem do zalogowania.
 */
export function classifyCompleteCartError(e: unknown): CompleteCartErrorKind {
  const raw = (e ?? {}) as { message?: string; type?: string };
  const msg = typeof raw.message === "string" ? raw.message : String(e ?? "");
  const type = raw.type ?? "";

  if (
    type === "payment_authorization_error" ||
    type === "payment_requires_more_error" ||
    /payment authorization/i.test(msg) ||
    /more information is required/i.test(msg)
  ) {
    return "payment_pending";
  }
  if (/already\s+completed/i.test(msg)) {
    return "already_completed";
  }
  return "error";
}

/** Unikalne, niepuste cart_id z wierszy linku cart↔payment_collection. */
export function uniqueCartIds(
  rows: Array<{ cart_id?: string | null }>,
): string[] {
  const out = new Set<string>();
  for (const row of rows) {
    const id = row.cart_id?.trim();
    if (id) out.add(id);
  }
  return [...out];
}

/**
 * Statusy payment_collection, przy których NIE odzyskujemy płatności —
 * kolekcja jest już rozliczona (completed) albo świadomie anulowana.
 *
 * Klasyfikujemy po payment_collection.status (realna kolumna), a NIE po
 * order.payment_status: to pole jest wyliczane tylko w API admina — w
 * `query.graph` wraca `undefined`, przez co filtr odrzucał WSZYSTKIE
 * zamówienia i odzyskiwanie sierot nigdy się nie uruchamiało (incydent
 * #10168/#10169: wpłaty w P24, zamówienia wisiały not_paid godzinami).
 * Nieznany/pusty status traktujemy jako odzyskiwalny — `authorizePaymentSession`
 * jest idempotentne, a provider i tak potwierdza środki w P24 przed capture.
 */
const SETTLED_PAYMENT_COLLECTION_STATUSES = new Set(["completed", "canceled"]);

export function isRecoverablePaymentCollectionStatus(
  status: string | null | undefined,
): boolean {
  return !SETTLED_PAYMENT_COLLECTION_STATUSES.has((status ?? "").trim());
}

export type OrderPaymentCollectionLink = {
  order_id?: string | null;
  payment_collection_id?: string | null;
};

/**
 * Mapuje payment_collection → order_id z linku order↔payment_collection.
 * Obecność linku = koszyk został domknięty i POWSTAŁO zamówienie (w odróżnieniu
 * od osieroconego koszyka, który dopiero trzeba domknąć `completeCartWorkflow`).
 */
export function mapCollectionsToOrders(
  rows: OrderPaymentCollectionLink[],
): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    const collectionId = row.payment_collection_id?.trim();
    const orderId = row.order_id?.trim();
    if (collectionId && orderId) out.set(collectionId, orderId);
  }
  return out;
}

/**
 * Id wiszących sesji P24 należących do wskazanych payment_collection.
 * Używane do odzyskania osieroconych ZAMÓWIEŃ: mając kolekcje powiązane z
 * zamówieniem, wybieramy ich sesje do `authorizePaymentSession`.
 */
export function pendingSessionIdsForCollections(
  sessions: P24SessionRow[],
  collectionIds: Iterable<string>,
): string[] {
  const wanted = new Set(collectionIds);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of sessions) {
    const sessionId = s.id?.trim();
    const collectionId = s.payment_collection_id?.trim();
    if (!sessionId || !collectionId) continue;
    if (!wanted.has(collectionId)) continue;
    if (seen.has(sessionId)) continue;
    seen.add(sessionId);
    out.push(sessionId);
  }
  return out;
}

export type AuthorizeSessionErrorKind = "not_paid_yet" | "already_settled" | "error";

/**
 * Klasyfikuje błąd `paymentModule.authorizePaymentSession` przy odzyskiwaniu:
 *  - `not_paid_yet` — provider (P24) nie potwierdził środków; sesja wraca do
 *    `pending`, Medusa rzuca NOT_ALLOWED „was not authorized”. Normalny stan
 *    (klient nie zapłacił albo P24 jeszcze nie ma wpłaty) — pomijamy po cichu.
 *  - `already_settled` — sesja już zautoryzowana/wyścig — też OK.
 *  - `error` — realny problem do zalogowania.
 */
export function classifyAuthorizeSessionError(e: unknown): AuthorizeSessionErrorKind {
  const raw = (e ?? {}) as { message?: string; type?: string };
  const msg = typeof raw.message === "string" ? raw.message : String(e ?? "");
  const type = raw.type ?? "";

  if (
    type === "not_allowed" ||
    /was not authorized/i.test(msg) ||
    /payment authorization/i.test(msg)
  ) {
    return "not_paid_yet";
  }
  if (/already/i.test(msg) && /authoriz/i.test(msg)) {
    return "already_settled";
  }
  return "error";
}
