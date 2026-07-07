import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { persistOrderNotes } from "../../../../lib/order-notes";

type Body = {
  order_id?: string;
  order_notes?: string;
};

/**
 * POST /store/custom/attach-order-notes
 *
 * Zapisuje uwagi klienta w metadata zamówienia (idempotentnie — nie nadpisuje
 * istniejącej wartości). Storefront woła fire-and-forget zaraz po completeCart.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const body = (req.body ?? {}) as Body;
  const orderId = body.order_id?.trim();
  if (!orderId) {
    return res.status(400).json({ ok: false, error: "missing order_id" });
  }

  try {
    const updated = await persistOrderNotes(req.scope, orderId, body.order_notes ?? "");
    return res.status(200).json({ ok: true, updated });
  } catch (e) {
    const err = e as { message?: string };
    console.error("[attach-order-notes] error", err);
    return res.status(500).json({
      ok: false,
      error: err.message ?? "attach-order-notes failed",
    });
  }
}
