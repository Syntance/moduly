import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { dispatchOrderPlacedEmails } from "../../../../lib/order-email-dispatch";
import { hasValidInternalSecret } from "../../../../lib/internal-auth";

type Body = {
  order_id?: string;
  email?: string;
  payment_provider_id?: string;
};

/**
 * POST /store/custom/notify-order-placed
 *
 * Awaryjny, server-to-server kanał wysyłki maila po completeCart (gdy subscriber
 * `order.placed` milczy). Wymaga sekretu `x-order-email-secret` — bez niego
 * każdy znający `order_id` mógłby spamować mailami (enumeracja zamówień).
 * Pierwszorzędne kanały: subscriber `order.placed` + storefront
 * `/api/checkout/notify-order-placed`.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const body = (req.body ?? {}) as Body;
  const orderId =
    body.order_id?.trim() ??
    (req.query.order_id as string | undefined)?.trim() ??
    "";

  if (!orderId) {
    return res.status(400).json({ ok: false, error: "missing order_id" });
  }

  const result = await dispatchOrderPlacedEmails(req.scope, {
    orderId,
    fallbackEmail: body.email,
    paymentProviderId: body.payment_provider_id,
  });

  if (result.step === "retrieve-order") {
    return res.status(404).json({
      ok: false,
      step: "retrieve-order",
      error: "order not found",
    });
  }
  if (result.step === "no-email") {
    return res.status(422).json({ ok: false, error: "order has no email" });
  }
  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      step: result.step ?? "send",
      orderId,
      email: result.email,
    });
  }

  return res.status(200).json({ ok: true, orderId, email: result.email });
}
