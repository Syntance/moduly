import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { hasValidInternalSecret } from "../../../../lib/internal-auth";
import { runP24Reconcile, type ReconcileLogger } from "../../../../lib/run-p24-reconcile";
import { dispatchOrderPlacedEmails } from "../../../../lib/order-email-dispatch";

/**
 * POST /store/custom/reconcile-p24
 *
 * Siatka bezpieczeństwa dla płatności Przelewy24 wołana zewnętrznym cronem
 * (Vercel `/api/cron/reconcile-p24`). Domyka koszyki z opłaconą, ale nie
 * sfinalizowaną sesją P24 (klient zamknął przeglądarkę po wpłacie). Działa
 * niezależnie od `MEDUSA_WORKER_MODE` — na pojedynczej instancji w trybie
 * `server` scheduled jobs nie chodzą, więc bez tego endpointu sieroty wisiały.
 *
 * Wymaga sekretu `x-order-email-secret` (ten sam co notify-*). Dla każdego
 * odzyskanego zamówienia wysyła idempotentnie mail `order.placed` — w trybie
 * `server` subscriber `order.placed` też nie odpala.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const logger = (() => {
    try {
      return req.scope.resolve("logger") as ReconcileLogger;
    } catch {
      return {
        info: (m: string) => console.info(m),
        warn: (m: string) => console.warn(m),
        error: (m: string) => console.error(m),
      } satisfies ReconcileLogger;
    }
  })();

  try {
    const result = await runP24Reconcile(req.scope, logger);

    // W trybie `server` subscriber order.placed nie odpala — dispatchujemy maile
    // ręcznie (idempotentnie; flaga email_sent zapobiega dublom w shared mode).
    const emails: Array<{ orderId: string; ok: boolean; step?: string }> = [];
    for (const orderId of result.recoveredOrderIds) {
      try {
        const r = await dispatchOrderPlacedEmails(req.scope, { orderId });
        emails.push({ orderId, ok: r.ok, step: r.step });
      } catch (e) {
        logger.warn(`[reconcile-p24] mail order=${orderId}: ${(e as Error)?.message ?? e}`);
        emails.push({ orderId, ok: false, step: "exception" });
      }
    }

    return res.status(200).json({
      ok: true,
      candidates: result.candidates,
      completed: result.completed,
      settled: result.settled,
      recovered_order_ids: result.recoveredOrderIds,
      emails,
    });
  } catch (e) {
    logger.error(`[reconcile-p24] endpoint nieudany: ${(e as Error)?.message ?? e}`);
    return res.status(500).json({ ok: false, error: "reconcile failed" });
  }
}
