import type { MedusaContainer } from "@medusajs/framework/types";
import { captureError } from "../lib/sentry";
import { runTpayReconcile, type ReconcileLogger } from "../lib/run-tpay-reconcile";

/**
 * Rekoncyliacja płatności tpay — analogiczna do P24. Logika w
 * `lib/run-tpay-reconcile.ts`, współdzielona z endpointem HTTP
 * (`/store/custom/reconcile-tpay`).
 */
export default async function reconcileTpayPaymentsJob(container: MedusaContainer) {
  const logger = container.resolve("logger") as ReconcileLogger;
  try {
    await runTpayReconcile(container, logger);
  } catch (e) {
    logger.error(`[tpay-reconcile] przebieg nieudany: ${(e as Error)?.message ?? e}`);
    captureError(e, { job: "reconcile-tpay-payments" });
  }
}

export const config = {
  name: "reconcile-tpay-payments",
  schedule: "*/10 * * * *",
};
