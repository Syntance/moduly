import type { EcommerceItem } from "./events/registry";

/**
 * Zaokrągla kwotę PLN do 2 miejsc — eliminuje artefakty floata po dzieleniu
 * grosze/100 (np. 19.990000000000002), które brudzą GA4/Meta/PostHog.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CartLineForAnalytics {
  id: string;
  variant_id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  total?: number;
  metadata?: Record<string, unknown>;
}

export interface CartForAnalytics {
  items: CartLineForAnalytics[];
  total?: number;
  subtotal?: number;
  currency?: string;
}

export function cartLineToItem(line: CartLineForAnalytics): EcommerceItem {
  const category =
    typeof line.metadata?.category === "string"
      ? line.metadata.category
      : undefined;

  return {
    item_id: line.variant_id ?? line.id,
    item_name: line.title,
    price: round2(line.unit_price),
    quantity: line.quantity,
    ...(category ? { item_category: category } : {}),
  };
}

export function cartToEcommercePayload(cart: CartForAnalytics): {
  value: number;
  currency: string;
  items: EcommerceItem[];
  items_count: number;
} {
  const items = cart.items.map(cartLineToItem);
  const value = round2(cart.total ?? cart.subtotal ?? 0);
  return {
    value,
    currency: cart.currency ?? "PLN",
    items,
    items_count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export function productToItem(args: {
  id: string;
  title: string;
  price: number;
  quantity?: number;
  category?: string;
}): EcommerceItem {
  return {
    item_id: args.id,
    item_name: args.title,
    price: round2(args.price),
    quantity: args.quantity ?? 1,
    ...(args.category ? { item_category: args.category } : {}),
  };
}
