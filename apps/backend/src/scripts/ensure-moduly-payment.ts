import type { ExecArgs } from "@medusajs/framework/types";
import { ensureModulyPayment } from "../lib/ensure-moduly-payment";

/**
 * CLI: `pnpm --filter @moduly/backend setup-payment`
 *
 * Idempotentnie podpina payment providerów (system + P24/Stripe/tpay wg FEATURE_*).
 */
export default async function run({ container }: ExecArgs) {
  const result = await ensureModulyPayment(container);
  for (const msg of result.messages) {
    console.log(`[setup-payment] ${msg}`);
  }
  console.log(
    `[setup-payment] ok=${result.ok} updated=${result.updated_region_ids.length} providers=${result.provider_ids.join(", ")}`,
  );
  if (!result.ok) {
    process.exitCode = 1;
  }
}
