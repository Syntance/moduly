import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  ORDER_NOTES_METADATA_KEY,
  sanitizeOrderNotes,
} from "./order-notes";

export const PAYMENT_PROVIDER_METADATA_KEY = "payment_provider_id";

export async function persistCartCheckoutMetadata(
  scope: MedusaContainer,
  cartId: string,
  input: {
    orderNotes?: string;
    paymentProviderId?: string;
  },
): Promise<void> {
  const patch: Record<string, string> = {};

  const notes = sanitizeOrderNotes(input.orderNotes);
  if (notes) patch[ORDER_NOTES_METADATA_KEY] = notes;

  const providerId = input.paymentProviderId?.trim();
  if (providerId) patch[PAYMENT_PROVIDER_METADATA_KEY] = providerId;

  if (Object.keys(patch).length === 0) return;

  const cartModule = scope.resolve(Modules.CART);
  const existingList = await cartModule.listCarts(
    { id: [cartId] },
    { select: ["id", "metadata"], take: 1 },
  );
  const existing = existingList[0];
  const prev =
    existing?.metadata && typeof existing.metadata === "object"
      ? { ...existing.metadata }
      : {};

  await cartModule.updateCarts([
    { id: cartId, metadata: { ...prev, ...patch } },
  ]);
}
