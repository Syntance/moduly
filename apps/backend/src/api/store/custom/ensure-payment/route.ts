import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ensureModulyPayment } from "../../../../lib/ensure-moduly-payment";

/**
 * POST /store/custom/ensure-payment
 * Idempotentnie dokleja systemowego payment-providera do regionów (tryb
 * testowy bez zewnętrznej bramki). Wywołujemy z checkoutu, gdy
 * `listPaymentProviders({ region_id })` zwraca pustą listę.
 * Wyłącz: MODULY_DISABLE_PUBLIC_ENSURE_PAYMENT=true
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (process.env.MODULY_DISABLE_PUBLIC_ENSURE_PAYMENT === "true") {
    return res.status(403).json({
      message: "Publiczny bootstrap płatności jest wyłączony.",
    });
  }

  const result = await ensureModulyPayment(req.scope);

  const status = result.ok ? 200 : 422;
  return res.status(status).json(result);
}
