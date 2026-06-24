import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { dispatchOrderEmail } from "../../../../lib/order-email-dispatch";

type Body = {
  order_id?: string;
  email?: string;
};

/**
 * POST /store/custom/notify-order-placed
 *
 * Awaryjne domknięcie maila „zamówienie złożone" ze storefrontu (gdy subscriber
 * `order.placed` nie odpalił — np. tryb `server`). Idempotentne: dispatch sam
 * sprawdza flagę `email_sent_placed` w metadata zamówienia.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const orderId = req.body?.order_id?.trim();
  if (!orderId) {
    return res.status(400).json({ ok: false, error: "order_id wymagane" });
  }

  try {
    const result = await dispatchOrderEmail(req.scope, {
      orderId,
      type: "placed",
      fallbackEmail: req.body?.email?.trim() || undefined,
    });
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (e) {
    console.error("[notify-order-placed] error", e);
    return res.status(500).json({ ok: false, error: "notify-order-placed failed" });
  }
}
