import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { hasValidInternalSecret } from "../../../../lib/internal-auth";
import { dispatchRecoveredOrderEmails } from "../../../../lib/order-email-dispatch";
import { runP24Reconcile, type ReconcileLogger } from "../../../../lib/run-p24-reconcile";

/**
 * POST /store/custom/reconcile-p24
 *
 * Siatka bezpieczeństwa niezależna od `MEDUSA_WORKER_MODE`. Na pojedynczej
 * instancji w trybie `server` scheduled jobs nie chodzą — wtedy domyka to
 * zewnętrzny cron (Vercel → ten endpoint). Autoryzacja: `x-order-email-secret`.
 *
 * Po domknięciu koszyków dispatchuje maile dla odzyskanych zamówień (w trybie
 * `server` subscriber `order.placed` też nie odpala, więc to jedyny tor maila).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const logger = req.scope.resolve("logger") as ReconcileLogger;

  try {
    const result = await runP24Reconcile(req.scope, logger);
    let mailsDispatched = 0;
    if (result.recoveredOrderIds.length > 0) {
      const { dispatched } = await dispatchRecoveredOrderEmails(
        req.scope,
        result.recoveredOrderIds,
        "placed",
      );
      mailsDispatched = dispatched;
    }
    return res.status(200).json({
      ok: true,
      candidates: result.candidates,
      completed: result.completed,
      recovered_order_ids: result.recoveredOrderIds,
      mails_dispatched: mailsDispatched,
    });
  } catch (e) {
    logger.error(`[reconcile-p24] endpoint error: ${(e as Error)?.message ?? e}`);
    return res.status(500).json({ ok: false, error: "reconcile-p24 failed" });
  }
}
