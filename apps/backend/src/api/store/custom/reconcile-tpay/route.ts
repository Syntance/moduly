import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { hasValidInternalSecret } from "../../../../lib/internal-auth";
import { dispatchOrderPlacedEmails } from "../../../../lib/order-email-dispatch";
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
    // Nowe API dispatchu (parytet z reconcile-p24): mail per zamówienie,
    // idempotentnie (flaga email_sent zapobiega dublom w shared mode).
    let mailsDispatched = 0;
    for (const orderId of result.recoveredOrderIds) {
      try {
        const r = await dispatchOrderPlacedEmails(req.scope, { orderId });
        if (r.ok) mailsDispatched += 1;
      } catch (e) {
        logger.warn(
          `[reconcile-tpay] mail order=${orderId}: ${(e as Error)?.message ?? e}`,
        );
      }
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
