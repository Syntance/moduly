"use client";

import { useCallback } from "react";
import { useCartContext } from "@/providers/CartProvider";
import { productToItem, round2 } from "@/lib/analytics/medusa-items";
import { track } from "@/lib/analytics/track";
import { consumeUpsellReferral } from "@/lib/analytics/upsell-attribution";

export function useCart() {
  const cart = useCartContext();

  const addItemWithTracking = useCallback(
    async (
      variantId: string,
      productData: {
        id: string;
        title: string;
        price: number;
        currency: string;
        thumbnail?: string;
      },
      quantity = 1,
      metadata?: Record<string, string>,
      options?: {
        openDrawer?: boolean;
      },
    ) => {
      await cart.addItem(variantId, quantity, metadata, options?.openDrawer ?? true, {
        title: productData.title,
        thumbnail: productData.thumbnail,
        unit_price: productData.price,
      });
      const item = productToItem({
        id: productData.id,
        title: productData.title,
        price: productData.price,
        quantity,
      });
      track("add_to_cart", {
        currency: productData.currency,
        value: round2(productData.price * quantity),
        items: [item],
        items_count: quantity,
      });

      // Jeśli produkt trafił do koszyka z sugestii upsell — domknij atrybucję.
      const upsell = consumeUpsellReferral(productData.id);
      if (upsell) {
        track("upsell_accepted", {
          product_id: productData.id,
          ...(upsell.fromProductId
            ? { upsell_product_id: upsell.fromProductId }
            : {}),
        });
      }
    },
    [cart.addItem],
  );

  return {
    ...cart,
    addItemWithTracking,
  };
}
