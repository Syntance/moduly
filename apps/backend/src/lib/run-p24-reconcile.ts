import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { captureError, captureMessage } from "./sentry";
import {
  classifyCompleteCartError,
  isReconcilableSession,
  PRZELEWY24_PROVIDER_ID,
  RECONCILE_MAX_PER_RUN,
  uniqueCartIds,
  type P24SessionRow,
} from "./p24-reconcile";

type QueryGraph = {
  graph: (q: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
    pagination?: {
      skip?: number;
      take?: number;
      order?: Record<string, "ASC" | "DESC">;
    };
  }) => Promise<{ data: unknown[] }>;
};

export type ReconcileLogger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

export type P24ReconcileResult = {
  /** Liczba sprawdzonych koszyków z wiszącą sesją P24. */
  candidates: number;
  /** Liczba domkniętych koszyków (utworzonych zamówień). */
  completed: number;
  /** ID zamówień odzyskanych w tym przebiegu (do dispatchu maili w server mode). */
  recoveredOrderIds: string[];
};

/**
 * Rdzeń rekoncyliacji Przelewy24 — współdzielony przez scheduled job
 * (`jobs/reconcile-p24-payments`) i endpoint HTTP (`/store/custom/reconcile-p24`).
 *
 * Endpoint to siatka bezpieczeństwa niezależna od trybu workera Medusy: na
 * pojedynczej instancji w `MEDUSA_WORKER_MODE=server` scheduled jobs nie chodzą,
 * więc wiszące płatności P24 (klient zamknął przeglądarkę po wpłacie) nigdy nie
 * domykały się same. Zewnętrzny cron (Vercel) wołający endpoint to standard
 * branżowy (cron-job → HTTP).
 *
 * Zamówienie powstaje WYŁĄCZNIE gdy provider P24 potwierdzi środki
 * (`completeCartWorkflow` → authorizePayment → pull-based `transaction/verify`).
 * Nieopłacone sesje kończą się `PAYMENT_AUTHORIZATION_ERROR` (po cichu pomijane).
 */
export async function runP24Reconcile(
  container: MedusaContainer,
  logger: ReconcileLogger,
): Promise<P24ReconcileResult> {
  const empty: P24ReconcileResult = {
    candidates: 0,
    completed: 0,
    recoveredOrderIds: [],
  };

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph;

  // 1. Wiszące sesje P24 (pending = klient był na bramce, brak potwierdzenia).
  const { data: sessionRows } = await query.graph({
    entity: "payment_session",
    fields: ["id", "status", "provider_id", "created_at", "payment_collection_id"],
    filters: { provider_id: PRZELEWY24_PROVIDER_ID, status: "pending" },
    pagination: { take: 500, order: { created_at: "DESC" } },
  });

  const now = Date.now();
  const reconcilable = (sessionRows as P24SessionRow[]).filter((row) =>
    isReconcilableSession(row, now),
  );
  if (reconcilable.length === 0) return empty;

  // 2. Sesja → koszyk (link cart ↔ payment_collection).
  const collectionIds = [
    ...new Set(
      reconcilable
        .map((row) => row.payment_collection_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: linkRows } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["cart_id", "payment_collection_id"],
    filters: { payment_collection_id: collectionIds },
    pagination: { take: collectionIds.length },
  });
  const cartIds = uniqueCartIds(linkRows as Array<{ cart_id?: string | null }>);
  if (cartIds.length === 0) return empty;

  // 3. Tylko niedomknięte koszyki.
  const { data: cartRows } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at"],
    filters: { id: cartIds },
    pagination: { take: cartIds.length },
  });
  const candidates = (cartRows as Array<{ id: string; completed_at?: string | null }>)
    .filter((c) => !c.completed_at)
    .slice(0, RECONCILE_MAX_PER_RUN);

  if (candidates.length === 0) return empty;
  logger.info(
    `[p24-reconcile] sprawdzam ${candidates.length} koszyków z wiszącą sesją P24`,
  );

  // 4. Sekwencyjnie (nie równolegle) — oszczędza P24 API i workflow engine.
  const recoveredOrderIds: string[] = [];
  for (const cart of candidates) {
    try {
      const { result } = await completeCartWorkflow(container).run({
        input: { id: cart.id },
      });
      recoveredOrderIds.push(result.id);
      logger.info(
        `[p24-reconcile] koszyk ${cart.id} domknięty → zamówienie ${result.id} (płatność potwierdzona w P24)`,
      );
    } catch (e) {
      const kind = classifyCompleteCartError(e);
      if (kind === "payment_pending" || kind === "already_completed") {
        continue; // normalny stan — wpłata jeszcze nie dotarła / ktoś nas ubiegł
      }
      logger.warn(`[p24-reconcile] koszyk ${cart.id}: ${(e as Error)?.message ?? e}`);
      captureError(e, { job: "reconcile-p24-payments", cart_id: cart.id });
    }
  }

  if (recoveredOrderIds.length > 0) {
    logger.info(`[p24-reconcile] domknięto ${recoveredOrderIds.length} zamówień`);
    // Distinct alert: reconcile odzyskał płatność, która cicho zginęła
    // (webhook + strona powrotu zawiodły). Sygnał do zbadania, nie błąd.
    captureMessage(
      `[p24-reconcile] odzyskano ${recoveredOrderIds.length} zamówień — płatność domknięta przez reconcile (webhook/return zawiodły)`,
      "warning",
      { provider: "przelewy24", recovered: recoveredOrderIds.length },
    );
  }

  return {
    candidates: candidates.length,
    completed: recoveredOrderIds.length,
    recoveredOrderIds,
  };
}
