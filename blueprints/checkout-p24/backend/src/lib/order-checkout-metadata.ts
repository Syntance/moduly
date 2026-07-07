import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { PAYMENT_PROVIDER_METADATA_KEY } from "./order-payment-method";

export const EMAIL_SENT_METADATA_PREFIX = "email_sent_";

export async function persistOrderCheckoutMetadata(
  scope: MedusaContainer,
  orderId: string,
  patch: Record<string, string>,
): Promise<void> {
  if (!orderId || Object.keys(patch).length === 0) return;

  const orderModule = scope.resolve(Modules.ORDER);
  const existing = await orderModule.retrieveOrder(orderId, {
    select: ["id", "metadata"],
  });
  const prev =
    existing?.metadata && typeof existing.metadata === "object"
      ? { ...existing.metadata }
      : {};

  await orderModule.updateOrders([
    { id: orderId, metadata: { ...prev, ...patch } },
  ]);
}

export async function markOrderEmailSent(
  scope: MedusaContainer,
  orderId: string,
  context: string,
): Promise<void> {
  await persistOrderCheckoutMetadata(scope, orderId, {
    [`${EMAIL_SENT_METADATA_PREFIX}${context}`]: new Date().toISOString(),
  });
}

export function wasOrderEmailSent(
  order: Record<string, unknown>,
  context: string,
): boolean {
  const meta = order.metadata;
  if (!meta || typeof meta !== "object") return false;
  const key = `${EMAIL_SENT_METADATA_PREFIX}${context}`;
  return typeof (meta as Record<string, unknown>)[key] === "string";
}

export async function copyPaymentProviderToOrder(
  scope: MedusaContainer,
  orderId: string,
  providerId: string,
): Promise<void> {
  const trimmed = providerId.trim();
  if (!trimmed) return;
  await persistOrderCheckoutMetadata(scope, orderId, {
    [PAYMENT_PROVIDER_METADATA_KEY]: trimmed,
  });
}
