import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { internalSecret } from "./internal-auth";

/**
 * Typ maila zamówienia. `placed` = płatność online potwierdzona,
 * `bank_transfer_pending` = przelew tradycyjny (instrukcja wpłaty).
 */
export type OrderEmailType = "placed" | "bank_transfer_pending";

const EMAIL_SENT_METADATA_PREFIX = "email_sent_";

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed || undefined;
}

function metadataFlagKey(type: OrderEmailType): string {
  return `${EMAIL_SENT_METADATA_PREFIX}${type}`;
}

type OrderRow = {
  id: string;
  email?: string | null;
  display_id?: number | null;
  total?: number | null;
  item_total?: number | null;
  subtotal?: number | null;
  shipping_total?: number | null;
  currency_code?: string | null;
  metadata?: Record<string, unknown> | null;
};

const RETRY_DELAYS_MS = [0, 400, 800, 1200, 2000];

async function retrieveOrder(
  scope: MedusaContainer,
  orderId: string,
): Promise<OrderRow | null> {
  const orderModule = scope.resolve(Modules.ORDER);
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    try {
      const order = (await orderModule.retrieveOrder(orderId, {
        select: [
          "id",
          "email",
          "display_id",
          "total",
          "item_total",
          "subtotal",
          "shipping_total",
          "currency_code",
          "metadata",
        ],
      })) as unknown as OrderRow;
      if (order) return order;
    } catch {
      /* zamówienie może jeszcze nie być widoczne tuż po completeCart */
    }
  }
  return null;
}

async function markEmailSent(
  scope: MedusaContainer,
  order: OrderRow,
  type: OrderEmailType,
): Promise<void> {
  const orderModule = scope.resolve(Modules.ORDER);
  const prev =
    order.metadata && typeof order.metadata === "object" ? { ...order.metadata } : {};
  await orderModule.updateOrders([
    {
      id: order.id,
      metadata: { ...prev, [metadataFlagKey(type)]: new Date().toISOString() },
    },
  ]);
}

function wasEmailSent(order: OrderRow, type: OrderEmailType): boolean {
  const flag = order.metadata?.[metadataFlagKey(type)];
  return typeof flag === "string" && flag.trim().length > 0;
}

function toMinor(value: unknown): number {
  return Math.round(Number(value ?? 0) * 100) || 0;
}

/**
 * Wysyła mail zamówienia przez storefrontowy endpoint `/api/internal/order-email`
 * (tam żyje rendering + Resend). Idempotentnie — flaga `email_sent_<type>`
 * w metadata zamówienia chroni przed dublami (subscriber + reconcile + retry).
 *
 * Zwraca `{ ok, step }`. `step: "already-sent"` = nic nie wysłano (OK).
 */
export async function dispatchOrderEmail(
  scope: MedusaContainer,
  params: {
    orderId: string;
    type: OrderEmailType;
    fallbackEmail?: string;
  },
): Promise<{ ok: boolean; step: string; email?: string }> {
  const storefrontUrl = trimEnv(process.env.STOREFRONT_URL);
  const secret = internalSecret();
  if (!storefrontUrl || !secret) {
    return { ok: false, step: "not-configured" };
  }

  const order = await retrieveOrder(scope, params.orderId);
  if (!order) return { ok: false, step: "retrieve-order" };

  const email = params.fallbackEmail?.trim() || order.email?.trim() || "";
  if (!email) return { ok: false, step: "no-email" };

  if (wasEmailSent(order, params.type)) {
    return { ok: true, step: "already-sent", email };
  }

  const displayId =
    typeof order.display_id === "number" ? order.display_id : undefined;
  const snapshot =
    displayId && displayId > 0
      ? {
          email,
          displayId,
          total: toMinor(order.total),
          itemTotal: toMinor(order.item_total ?? order.subtotal),
          shippingTotal: toMinor(order.shipping_total),
          currencyCode: (order.currency_code ?? "PLN").toUpperCase(),
        }
      : undefined;

  try {
    const res = await fetch(
      `${storefrontUrl.replace(/\/$/, "")}/api/internal/order-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-order-email-secret": secret,
        },
        body: JSON.stringify({
          order_id: params.orderId,
          type: params.type,
          ...(snapshot ? { snapshot } : {}),
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      console.warn("[mail] order-email storefront", res.status);
      return { ok: false, step: "storefront-error", email };
    }
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      skipped?: boolean;
    };
    if (data.ok) {
      if (!data.skipped) await markEmailSent(scope, order, params.type);
      return { ok: true, step: data.skipped ? "already-sent" : "sent", email };
    }
    return { ok: false, step: "storefront-not-ok", email };
  } catch (e) {
    console.warn("[mail] order-email error", e);
    return { ok: false, step: "exception", email };
  }
}

/** Dispatch maili dla listy zamówień odzyskanych przez reconcile. */
export async function dispatchRecoveredOrderEmails(
  scope: MedusaContainer,
  orderIds: string[],
  type: OrderEmailType = "placed",
): Promise<{ dispatched: number }> {
  let dispatched = 0;
  for (const orderId of orderIds) {
    const result = await dispatchOrderEmail(scope, { orderId, type });
    if (result.ok && result.step === "sent") dispatched += 1;
  }
  return { dispatched };
}
