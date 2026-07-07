import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import crypto from "node:crypto";
import { captureError } from "../lib/sentry";
import { sendPurchaseCAPI } from "../lib/meta-capi";
import {
  dispatchBankTransferPendingEmail,
  dispatchOrderPlacedEmails,
} from "../lib/order-email-dispatch";
import { orderAwaitingBankTransfer } from "../lib/order-payment-method";
import { copyP24PaymentDetailsToOrder } from "../lib/order-p24-metadata";
import {
  retrieveOrderForEmail,
} from "../lib/send-email";
import { readAnalyticsConsent } from "../lib/analytics-consent-metadata";

/**
 * Subscriber „order.placed" — pierwszorzędny kanał wysyłki maila potwierdzającego.
 *
 * Meta CAPI Purchase — server-side w sendPurchaseCAPI (event_id = purchase_{order.id}).
 * PostHog — fire-and-forget z timeoutem.
 */

async function withTimeout<T>(
  label: string,
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error(`${label} timeout ${ms}ms`)), ms);
  try {
    return await fn(ac.signal);
  } finally {
    clearTimeout(timer);
  }
}

export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = (() => {
    try {
      return container.resolve("logger") as {
        info: (msg: string) => void;
      };
    } catch {
      return { info: (msg: string) => console.info(msg) };
    }
  })();
  logger.info(`[order-placed] start id=${event.data.id}`);

  const orderService: IOrderModuleService =
    container.resolve(Modules.ORDER);

  let order: Awaited<ReturnType<typeof orderService.retrieveOrder>>;
  let orderForEmail: Record<string, unknown> | null;
  try {
    order = await orderService.retrieveOrder(event.data.id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    });
    orderForEmail =
      (await retrieveOrderForEmail(container, event.data.id)) ??
      (order as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[order-placed] retrieveOrder failed", e);
    orderForEmail = await retrieveOrderForEmail(container, event.data.id);
    if (!orderForEmail) {
      captureError(e, {
        subscriber: "order-placed",
        step: "retrieveOrder",
        orderId: event.data.id,
      });
      return;
    }
    order = orderForEmail as unknown as Awaited<
      ReturnType<typeof orderService.retrieveOrder>
    >;
  }

  const emailOrder = orderForEmail ?? (order as unknown as Record<string, unknown>);
  const fallbackEmail = (order?.email as string | undefined) ?? undefined;

  try {
    await copyP24PaymentDetailsToOrder(container, event.data.id);
  } catch (e) {
    console.error("[order-placed] copyP24PaymentDetailsToOrder failed", e);
    captureError(e, {
      subscriber: "order-placed",
      step: "p24-payment-metadata",
      orderId: event.data.id,
    });
  }

  if (order?.email || fallbackEmail) {
    const isBankTransfer = orderAwaitingBankTransfer(
      emailOrder as Record<string, unknown>,
    );
    try {
      await withTimeout("email", 8000, async () => {
        if (isBankTransfer) {
          await dispatchBankTransferPendingEmail(container, {
            orderId: order.id,
            fallbackEmail,
          });
        } else {
          await dispatchOrderPlacedEmails(container, {
            orderId: order.id,
            fallbackEmail,
          });
        }
      });
    } catch (e) {
      console.error("[order-placed] email failed", e);
      captureError(e, {
        subscriber: "order-placed",
        step: "email",
        orderId: order.id,
      });
    }
  } else {
    console.warn(
      `[order-placed] order ${order?.id} nie ma emaila — pomijam wysyłkę potwierdzenia`,
    );
  }

  // RODO: bramkuj server-side eventy snapshotem zgód z order.metadata.
  // Fail-closed — brak decyzji w snapshocie traktujemy jak brak zgody.
  const consent = readAnalyticsConsent(
    order as unknown as { metadata?: Record<string, unknown> | null },
  );

  if (consent.marketing === true) {
    void sendPurchaseCAPI(container, order as Parameters<typeof sendPurchaseCAPI>[1]).catch(
      (e) => {
        console.error("[order-placed] sendPurchaseCAPI", e);
        captureError(e, {
          subscriber: "order-placed",
          step: "metaCAPI",
          orderId: order?.id,
        });
      },
    );
  } else {
    logger.info(
      `[order-placed] CAPI pominięte (brak zgody marketing) id=${order?.id}`,
    );
  }

  if (consent.analytics === true) {
    void sendPostHogEvent(
      order as Parameters<typeof sendPostHogEvent>[0],
      consent.phDistinctId,
    ).catch((e) => {
      console.error("[order-placed] sendPostHogEvent", e);
      captureError(e, {
        subscriber: "order-placed",
        step: "posthog",
        orderId: order?.id,
      });
    });
  } else {
    logger.info(
      `[order-placed] PostHog pominięte (brak zgody analytics) id=${order?.id}`,
    );
  }
}

interface OrderPostHogLike {
  id: string;
  email?: string | null;
  total?: number | null;
  currency_code?: string | null;
  items?: Array<{
    title?: string;
    quantity?: number;
    unit_price?: number;
  }>;
}

async function sendPostHogEvent(
  order: OrderPostHogLike,
  snapshotDistinctId?: string,
): Promise<void> {
  const posthogKey = process.env.POSTHOG_API_KEY;
  if (!posthogKey) return;

  // distinct_id: priorytet snapshot z klienta (spójność lejka
  // begin_checkout → purchase jako JEDNA osoba). Fallback: hash emaila,
  // ostatecznie order.id.
  const email: string | undefined = order?.email ?? undefined;
  const distinctId: string =
    snapshotDistinctId?.trim() ||
    (email
      ? crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex")
      : (order?.id ?? "anonymous"));

  const items = order.items ?? [];

  // Medusa v2 trzyma kwoty w jednostkach głównych (PLN), NIE w groszach —
  // żadnego /100. $insert_id zapewnia dedup nawet przy retry subscribera.
  await withTimeout("posthog", 3000, (signal) =>
    fetch("https://eu.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: posthogKey,
        event: "purchase",
        distinct_id: distinctId,
        properties: {
          $insert_id: `purchase_${order.id}`,
          order_id: order.id,
          total: Number(order.total ?? 0),
          value: Number(order.total ?? 0),
          currency: order.currency_code,
          items_count: items.length,
          items: items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            price: Number(i.unit_price ?? 0),
          })),
        },
      }),
      signal,
    }),
  );
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
