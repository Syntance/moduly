import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ensureModulyShipping } from "../../../../lib/ensure-moduly-shipping";

/**
 * POST /store/custom/ensure-shipping
 * Idempotentnie tworzy opcję „Kurier DPD” w strefie PL (gdy brak w Adminie).
 * Wyłącz: MODULY_DISABLE_PUBLIC_ENSURE_SHIPPING=true
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (process.env.MODULY_DISABLE_PUBLIC_ENSURE_SHIPPING === "true") {
    return res.status(403).json({
      message: "Publiczny bootstrap dostawy jest wyłączony.",
    });
  }

  const result = await ensureModulyShipping(req.scope);
  const status = result.ok ? 200 : 422;
  return res.status(status).json(result);
}
