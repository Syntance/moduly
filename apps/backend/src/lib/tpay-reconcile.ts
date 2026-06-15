/**
 * Logika rekoncyliacji płatności tpay — analogiczna do P24.
 */

export const TPAY_PROVIDER_ID = "pp_tpay_tpay";

export const RECONCILE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;
export const RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;
export const RECONCILE_MAX_PER_RUN = 25;

export type TpaySessionRow = {
  id?: string | null;
  provider_id?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  payment_collection_id?: string | null;
};

function ageMs(createdAt: string | Date | null | undefined, now: number): number | null {
  if (!createdAt) return null;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return null;
  return now - t;
}

export function isReconcilableSession(
  row: TpaySessionRow,
  now: number = Date.now(),
): boolean {
  if (row.provider_id !== TPAY_PROVIDER_ID) return false;
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
