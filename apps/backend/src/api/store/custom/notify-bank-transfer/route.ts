import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { dispatchOrderEmail } from "../../../../lib/order-email-dispatch";

type Body = {
  order_id?: string;
  email?: string;
};

/**
 * POST /store/custom/notify-bank-transfer
 *
 * Mail z instrukcją przelewu tradycyjnego. Idempotentne (flaga
 * `email_sent_bank_transfer_pending` w metadata zamówienia).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const orderId = req.body?.order_id?.trim();
  if (!orderId) {
    return res.status(400).json({ ok: false, error: "order_id wymagane" });
  }

  try {
    const result = await dispatchOrderEmail(req.scope, {
      orderId,
      type: "bank_transfer_pending",
      fallbackEmail: req.body?.email?.trim() || undefined,
    });
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (e) {
    console.error("[notify-bank-transfer] error", e);
    return res.status(500).json({ ok: false, error: "notify-bank-transfer failed" });
  }
}
