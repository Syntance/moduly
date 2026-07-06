import type { MedusaContainer } from "@medusajs/framework/types";
import { captureError } from "../lib/sentry";
import { runP24Reconcile, type ReconcileLogger } from "../lib/run-p24-reconcile";

/**
 * Rekoncyliacja płatności Przelewy24 — siatka bezpieczeństwa na spóźnione
 * lub zgubione potwierdzenia (standard branżowy: webhook + cykliczny sweep).
 *
 * Główne tory domknięcia koszyka:
 *  1. strona powrotu klienta (`/checkout/przelewy24/return` → completeCart),
 *  2. webhook P24 (`urlStatus` → Medusa `processPaymentWorkflow`),
 *  3. ten scheduled job (działa tylko w `MEDUSA_WORKER_MODE` shared/worker),
 *  4. endpoint `/store/custom/reconcile-p24` wołany przez cron Vercel —
 *     siatka bezpieczeństwa niezależna od trybu workera (patrz run-p24-reconcile).
 *
 * Logikę współdzieli `runP24Reconcile`.
 */
export default async function reconcileP24PaymentsJob(container: MedusaContainer) {
  const logger = container.resolve("logger") as ReconcileLogger;
  try {
    await runP24Reconcile(container, logger);
  } catch (e) {
    // Job nie może ubić procesu — logujemy i czekamy na kolejny przebieg.
    logger.error(`[p24-reconcile] przebieg nieudany: ${(e as Error)?.message ?? e}`);
    captureError(e, { job: "reconcile-p24-payments" });
  }
}

export const config = {
  name: "reconcile-p24-payments",
  schedule: "*/10 * * * *",
};
