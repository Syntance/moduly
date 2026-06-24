import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { hasValidInternalSecret } from "../../../../lib/internal-auth";
import { dispatchRecoveredOrderEmails } from "../../../../lib/order-email-dispatch";
import { runTpayReconcile, type ReconcileLogger } from "../../../../lib/run-tpay-reconcile";

/**
 * POST /store/custom/reconcile-tpay
 *
 * Analogiczny do `reconcile-p24` — siatka bezpieczeństwa dla tpay niezależna od
 * trybu workera. Autoryzacja: `x-order-email-secret`.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const logger = req.scope.resolve("logger") as ReconcileLogger;

  try {
    const result = await runTpayReconcile(req.scope, logger);
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
    logger.error(`[reconcile-tpay] endpoint error: ${(e as Error)?.message ?? e}`);
    return res.status(500).json({ ok: false, error: "reconcile-tpay failed" });
  }
}
