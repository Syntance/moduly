import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { captureError } from "../lib/sentry";
import {
  classifyCompleteCartError,
  isReconcilableSession,
  RECONCILE_MAX_PER_RUN,
  TPAY_PROVIDER_ID,
  uniqueCartIds,
  type TpaySessionRow,
} from "../lib/tpay-reconcile";

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

type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

export default async function reconcileTpayPaymentsJob(container: MedusaContainer) {
  const logger = container.resolve("logger") as Logger;

  try {
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
    if (reconcilable.length === 0) return;

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
    if (cartIds.length === 0) return;

    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["id", "completed_at"],
      filters: { id: cartIds },
      pagination: { take: cartIds.length },
    });
    const candidates = (
      cartRows as Array<{ id: string; completed_at?: string | null }>
    )
      .filter((c) => !c.completed_at)
      .slice(0, RECONCILE_MAX_PER_RUN);

    if (candidates.length === 0) return;
    logger.info(
      `[tpay-reconcile] sprawdzam ${candidates.length} koszyków z wiszącą sesją tpay`,
    );

    let completed = 0;
    for (const cart of candidates) {
      try {
        const { result } = await completeCartWorkflow(container).run({
          input: { id: cart.id },
        });
        completed += 1;
        logger.info(
          `[tpay-reconcile] koszyk ${cart.id} domknięty → zamówienie ${result.id}`,
        );
      } catch (e) {
        const kind = classifyCompleteCartError(e);
        if (kind === "payment_pending" || kind === "already_completed") {
          continue;
        }
        logger.warn(
          `[tpay-reconcile] koszyk ${cart.id}: ${(e as Error)?.message ?? e}`,
        );
        captureError(e, { job: "reconcile-tpay-payments", cart_id: cart.id });
      }
    }
    if (completed > 0) {
      logger.info(`[tpay-reconcile] domknięto ${completed} zamówień`);
    }
  } catch (e) {
    logger.error(`[tpay-reconcile] przebieg nieudany: ${(e as Error)?.message ?? e}`);
    captureError(e, { job: "reconcile-tpay-payments" });
  }
}

export const config = {
  name: "reconcile-tpay-payments",
  schedule: "*/10 * * * *",
};
