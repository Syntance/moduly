import type { MedusaContainer } from "@medusajs/framework/types";
import { captureError } from "../lib/sentry";
import { runP24Reconcile, type ReconcileLogger } from "../lib/run-p24-reconcile";

/**
 * Rekoncyliacja płatności Przelewy24 — siatka bezpieczeństwa na spóźnione
 * lub zgubione potwierdzenia (standard branżowy: webhook + cykliczny sweep).
 *
 * Głównym torem domknięcia koszyka pozostaje strona powrotu klienta i webhook
 * P24. Ten job łapie resztę. Cała logika żyje w `lib/run-p24-reconcile.ts`,
 * współdzielonym z endpointem HTTP (`/store/custom/reconcile-p24`), tak by ten
 * sam rdzeń działał niezależnie od `MEDUSA_WORKER_MODE` (w trybie `server`
 * scheduled jobs nie chodzą — wtedy domyka cron Vercel → endpoint).
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
