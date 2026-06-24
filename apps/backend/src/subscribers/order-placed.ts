import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { dispatchOrderEmail } from "../lib/order-email-dispatch";
import { captureError } from "../lib/sentry";

/**
 * Mail po złożeniu zamówienia (`order.placed`). Idempotentny — `dispatchOrderEmail`
 * sprawdza flagę `email_sent_*` w metadata, więc bezpieczny przy retry zdarzeń
 * i przy równoległym domknięciu przez reconcile.
 *
 * UWAGA: subscribery odpalają się TYLKO w `MEDUSA_WORKER_MODE` `shared`/`worker`.
 * W trybie `server` (1 instancja) ten subscriber nie zadziała — wtedy maile dla
 * zamówień odzyskanych domyka endpoint reconcile (`reconcile-*` → dispatch).
 *
 * Izolowany: nigdy nie rzuca w górę (subscriber nie może wywrócić checkoutu).
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const result = await dispatchOrderEmail(container, {
      orderId: event.data.id,
      type: "placed",
    });
    if (!result.ok && result.step !== "not-configured") {
      console.warn(
        `[order-placed] mail nie wysłany order=${event.data.id} step=${result.step}`,
      );
    }
  } catch (e) {
    console.error("[order-placed] handler error", e);
    captureError(e, { subscriber: "order-placed", orderId: event.data.id });
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
