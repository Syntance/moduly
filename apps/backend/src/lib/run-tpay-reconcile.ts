import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { captureError, captureMessage } from "./sentry";
import {
  classifyCompleteCartError,
  isReconcilableSession,
  RECONCILE_MAX_PER_RUN,
  TPAY_PROVIDER_ID,
  uniqueCartIds,
  type TpaySessionRow,
} from "./tpay-reconcile";

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

export type TpayReconcileResult = {
  candidates: number;
  completed: number;
  recoveredOrderIds: string[];
};

/**
 * Rdzeń rekoncyliacji tpay — analogiczny do P24 (patrz `run-p24-reconcile.ts`).
 * Współdzielony przez scheduled job i endpoint HTTP. Zamówienie powstaje tylko
 * gdy tpay potwierdzi środki (pull-based weryfikacja w authorizePayment).
 */
export async function runTpayReconcile(
  container: MedusaContainer,
  logger: ReconcileLogger,
): Promise<TpayReconcileResult> {
  const empty: TpayReconcileResult = {
    candidates: 0,
    completed: 0,
    recoveredOrderIds: [],
  };

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph;

  const { data: sessionRows } = await query.graph({
    entity: "payment_session",
    fields: ["id", "status", "provider_id", "created_at", "payment_collection_id"],
    filters: { provider_id: TPAY_PROVIDER_ID, status: "pending" },
    pagination: { take: 500, order: { created_at: "DESC" } },
  });

  const now = Date.now();
  const reconcilable = (sessionRows as TpaySessionRow[]).filter((row) =>
    isReconcilableSession(row, now),
  );
  if (reconcilable.length === 0) return empty;

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
    `[tpay-reconcile] sprawdzam ${candidates.length} koszyków z wiszącą sesją tpay`,
  );

  const recoveredOrderIds: string[] = [];
  for (const cart of candidates) {
    try {
      const { result } = await completeCartWorkflow(container).run({
        input: { id: cart.id },
      });
      recoveredOrderIds.push(result.id);
      logger.info(
        `[tpay-reconcile] koszyk ${cart.id} domknięty → zamówienie ${result.id}`,
      );
    } catch (e) {
      const kind = classifyCompleteCartError(e);
      if (kind === "payment_pending" || kind === "already_completed") {
        continue;
      }
      logger.warn(`[tpay-reconcile] koszyk ${cart.id}: ${(e as Error)?.message ?? e}`);
      captureError(e, { job: "reconcile-tpay-payments", cart_id: cart.id });
    }
  }

  if (recoveredOrderIds.length > 0) {
    logger.info(`[tpay-reconcile] domknięto ${recoveredOrderIds.length} zamówień`);
    captureMessage(
      `[tpay-reconcile] odzyskano ${recoveredOrderIds.length} zamówień — płatność domknięta przez reconcile (webhook/return zawiodły)`,
      "warning",
      { provider: "tpay", recovered: recoveredOrderIds.length },
    );
  }

  return {
    candidates: candidates.length,
    completed: recoveredOrderIds.length,
    recoveredOrderIds,
  };
}
