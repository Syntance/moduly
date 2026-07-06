import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export const ORDER_NOTES_METADATA_KEY = "order_notes";
export const ORDER_NOTES_MAX_LENGTH = 500;

/** Tekst-only — bez HTML (XSS w panelu magazynu / mailach). */
export function sanitizeOrderNotes(raw: string | undefined | null): string {
  if (!raw) return "";
  const stripped = raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, ORDER_NOTES_MAX_LENGTH);
}

export async function persistCartOrderNotes(
  scope: MedusaContainer,
  cartId: string,
  orderNotes: string,
): Promise<void> {
  const notes = sanitizeOrderNotes(orderNotes);
  if (!notes) return;

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
    { id: cartId, metadata: { ...prev, [ORDER_NOTES_METADATA_KEY]: notes } },
  ]);
}

export async function persistOrderNotes(
  scope: MedusaContainer,
  orderId: string,
  orderNotes: string,
): Promise<boolean> {
  const notes = sanitizeOrderNotes(orderNotes);
  if (!notes) return false;

  const orderModule = scope.resolve(Modules.ORDER);
  const existing = await orderModule.retrieveOrder(orderId, {
    select: ["id", "metadata"],
  });
  const prev =
    existing?.metadata && typeof existing.metadata === "object"
      ? { ...existing.metadata }
      : {};

  if (typeof prev[ORDER_NOTES_METADATA_KEY] === "string" && prev[ORDER_NOTES_METADATA_KEY].trim()) {
    return false;
  }

  await orderModule.updateOrders([
    { id: orderId, metadata: { ...prev, [ORDER_NOTES_METADATA_KEY]: notes } },
  ]);
  return true;
}
