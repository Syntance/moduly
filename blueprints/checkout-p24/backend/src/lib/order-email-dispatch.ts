import type { MedusaContainer } from "@medusajs/framework/types";
import {
  renderBankTransferPendingEmail,
  renderOrderPlacedEmail,
} from "./email-templates";
import {
  markOrderEmailSent,
  wasOrderEmailSent,
  copyPaymentProviderToOrder,
} from "./order-checkout-metadata";
import { copyP24PaymentDetailsToOrder } from "./order-p24-metadata";
import { orderAwaitingBankTransfer } from "./order-payment-method";
import { RESEND_DEFAULT_CONTACT_EMAIL } from "./resend-defaults";
import {
  buildOrderEmailPayload,
  retrieveOrderForEmail,
  sendTransactionalEmail,
} from "./send-email";

const RETRY_DELAYS_MS = [0, 400, 800, 1200, 2000];

type MagazynEmailType = "bank_transfer_pending" | "placed";

async function callMagazynOrderEmail(params: {
  orderId: string;
  type: MagazynEmailType;
  fallbackEmail?: string;
  order?: Record<string, unknown>;
}): Promise<{ ok: boolean; skipped?: boolean; email?: string }> {
  const storefrontUrl = trimEnv(process.env.STOREFRONT_URL);
  const secret =
    trimEnv(process.env.ORDER_EMAIL_INTERNAL_SECRET) ??
    trimEnv(process.env.MEDUSA_REVALIDATE_SECRET);
  if (!storefrontUrl || !secret) {
    return { ok: false };
  }

  const order = params.order;
  const email = params.fallbackEmail?.trim() ||
    (typeof order?.email === "string" ? order.email.trim() : "");
  const displayIdRaw = order?.display_id;
  const displayId =
    typeof displayIdRaw === "number"
      ? displayIdRaw
      : typeof displayIdRaw === "string"
        ? Number.parseInt(displayIdRaw, 10)
        : NaN;

  const snapshot =
    email && Number.isFinite(displayId) && displayId > 0
      ? {
          email,
          displayId,
          total: Math.round(Number(order?.total ?? 0) * 100) || 0,
          itemTotal: Math.round(Number(order?.item_total ?? order?.subtotal ?? 0) * 100) || 0,
          shippingTotal: Math.round(Number(order?.shipping_total ?? 0) * 100) || 0,
          currencyCode: (order?.currency_code as string | undefined) ?? "PLN",
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
      console.warn("[mail] magazyn internal API", res.status);
      return { ok: false };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      skipped?: boolean;
      email?: string;
    };
    if (data.ok) {
      console.info(
        `[mail] magazyn ${params.type} order=${params.orderId} skipped=${Boolean(data.skipped)}`,
      );
      return { ok: true, skipped: data.skipped, email: data.email };
    }
  } catch (e) {
    console.warn("[mail] magazyn internal API error", e);
  }
  return { ok: false };
}

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed || undefined;
}

async function sendLegacyCustomerEmail(
  scope: MedusaContainer,
  params: {
    orderId: string;
    order: Record<string, unknown>;
    email: string;
    context: "bank-transfer-pending" | "order-placed";
    isBankTransfer: boolean;
  },
): Promise<boolean> {
  const payload = buildOrderEmailPayload(params.order, { email: params.email });
  const { subject, html, text } = params.isBankTransfer
    ? renderBankTransferPendingEmail(payload)
    : renderOrderPlacedEmail(payload);

  const customerOk = await sendTransactionalEmail(scope, {
    to: params.email,
    subject,
    html,
    text,
    context: params.context,
    orderId: params.orderId,
  });

  if (!customerOk) return false;

  await markOrderEmailSent(scope, params.orderId, params.context);

  void sendShopNewOrderCopy(scope, {
    orderId: params.orderId,
    displayId:
      typeof payload.displayId === "number" ? payload.displayId : undefined,
    customerEmail: params.email,
    totalMinor: payload.totalMinor,
    currencyCode: payload.currencyCode,
    paymentLabel: params.isBankTransfer ? "Przelew tradycyjny" : "Online",
  }).catch((e) => {
    console.error("[mail:shop-new-order] failed", e);
  });

  return true;
}

export function shopOrderInbox(): string {
  return (
    trimEnv(process.env.SHOP_ORDER_NOTIFY_EMAIL) ??
    trimEnv(process.env.CONTACT_INBOX_EMAIL) ??
    trimEnv(process.env.RESEND_REPLY_TO) ??
    RESEND_DEFAULT_CONTACT_EMAIL
  );
}

export function resolveOrderRecipientEmail(
  order: Record<string, unknown>,
  fallbackEmail?: string,
): string {
  const fromOrder = (order.email as string | undefined)?.trim();
  if (fromOrder) return fromOrder;
  return fallbackEmail?.trim() ?? "";
}

export async function retryRetrieveOrderForEmail(
  scope: MedusaContainer,
  orderId: string,
): Promise<Record<string, unknown> | null> {
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const order = await retrieveOrderForEmail(scope, orderId);
    if (order) return order;
  }
  return null;
}

async function sendShopNewOrderCopy(
  scope: MedusaContainer,
  params: {
    orderId: string;
    displayId?: number;
    customerEmail: string;
    totalMinor: number;
    currencyCode: string;
    paymentLabel: string;
  },
): Promise<void> {
  const inbox = shopOrderInbox();
  if (!inbox) return;

  const num = params.displayId != null ? `#${params.displayId}` : params.orderId;
  const total = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: params.currencyCode || "PLN",
  }).format(params.totalMinor / 100);

  const subject = `Nowe zamówienie ${num} — ${total}`;
  const html = `<p>Nowe zamówienie w sklepie.</p>
<ul>
  <li><strong>Numer:</strong> ${num}</li>
  <li><strong>Klient:</strong> ${params.customerEmail}</li>
  <li><strong>Płatność:</strong> ${params.paymentLabel}</li>
  <li><strong>Kwota:</strong> ${total}</li>
</ul>`;
  const text = `Nowe zamówienie ${num}\nKlient: ${params.customerEmail}\nPłatność: ${params.paymentLabel}\nKwota: ${total}`;

  await sendTransactionalEmail(scope, {
    to: inbox,
    subject,
    html,
    text,
    context: "shop-new-order",
    orderId: params.orderId,
  });
}

export async function dispatchOrderPlacedEmails(
  scope: MedusaContainer,
  params: {
    orderId: string;
    fallbackEmail?: string;
    paymentProviderId?: string;
  },
): Promise<{ ok: boolean; step?: string; email?: string }> {
  const order = await retryRetrieveOrderForEmail(scope, params.orderId);
  if (!order) {
    return { ok: false, step: "retrieve-order" };
  }

  if (params.paymentProviderId) {
    await copyPaymentProviderToOrder(
      scope,
      params.orderId,
      params.paymentProviderId,
    );
    order.metadata = {
      ...(typeof order.metadata === "object" && order.metadata
        ? order.metadata
        : {}),
      payment_provider_id: params.paymentProviderId,
    };
  }

  // Tryb server: subscriber order.placed nie odpala — metadata P24 tu.
  try {
    await copyP24PaymentDetailsToOrder(scope, params.orderId);
  } catch (e) {
    console.warn(
      `[mail] copyP24PaymentDetailsToOrder order=${params.orderId}:`,
      e instanceof Error ? e.message : e,
    );
  }

  const email = resolveOrderRecipientEmail(order, params.fallbackEmail);
  if (!email) {
    return { ok: false, step: "no-email" };
  }

  const isBankTransfer = orderAwaitingBankTransfer(
    order as Parameters<typeof orderAwaitingBankTransfer>[0],
  );
  const context = isBankTransfer ? "bank-transfer-pending" : "order-placed";
  const magazynType: MagazynEmailType = isBankTransfer
    ? "bank_transfer_pending"
    : "placed";

  if (wasOrderEmailSent(order, context)) {
    return { ok: true, email, step: "already-sent" };
  }

  const magazyn = await callMagazynOrderEmail({
    orderId: params.orderId,
    type: magazynType,
    fallbackEmail: email,
    order,
  });
  if (magazyn.ok && !magazyn.skipped) {
    await markOrderEmailSent(scope, params.orderId, context);
    return { ok: true, email: magazyn.email ?? email, step: "magazyn" };
  }
  if (magazyn.ok && magazyn.skipped) {
    return { ok: true, email: magazyn.email ?? email, step: "already-sent" };
  }

  console.warn("[mail] magazyn fallback → legacy backend template", params.orderId);
  const legacyOk = await sendLegacyCustomerEmail(scope, {
    orderId: params.orderId,
    order,
    email,
    context,
    isBankTransfer,
  });
  if (!legacyOk) {
    return { ok: false, step: "send-customer", email };
  }

  return { ok: true, email, step: "legacy" };
}

export async function dispatchBankTransferPendingEmail(
  scope: MedusaContainer,
  params: {
    orderId: string;
    fallbackEmail?: string;
    paymentProviderId?: string;
  },
): Promise<{ ok: boolean; step?: string; email?: string }> {
  const order = await retryRetrieveOrderForEmail(scope, params.orderId);
  if (!order) {
    return { ok: false, step: "retrieve-order" };
  }

  const providerId = params.paymentProviderId ?? "pp_system_default";
  await copyPaymentProviderToOrder(scope, params.orderId, providerId);

  const email = resolveOrderRecipientEmail(order, params.fallbackEmail);
  if (!email) {
    return { ok: false, step: "no-email" };
  }

  const context = "bank-transfer-pending";
  if (wasOrderEmailSent(order, context)) {
    return { ok: true, email, step: "already-sent" };
  }

  const magazyn = await callMagazynOrderEmail({
    orderId: params.orderId,
    type: "bank_transfer_pending",
    fallbackEmail: email,
    order,
  });
  if (magazyn.ok && !magazyn.skipped) {
    await markOrderEmailSent(scope, params.orderId, context);
    return { ok: true, email: magazyn.email ?? email, step: "magazyn" };
  }
  if (magazyn.ok && magazyn.skipped) {
    return { ok: true, email: magazyn.email ?? email, step: "already-sent" };
  }

  console.warn("[mail] magazyn fallback → legacy backend template", params.orderId);
  const legacyOk = await sendLegacyCustomerEmail(scope, {
    orderId: params.orderId,
    order,
    email,
    context,
    isBankTransfer: true,
  });
  if (!legacyOk) {
    return { ok: false, step: "send-customer", email };
  }

  return { ok: true, email, step: "legacy" };
}
