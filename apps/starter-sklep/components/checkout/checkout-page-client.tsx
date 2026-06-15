"use client";

import { CheckoutForm } from "@moduly/commerce";
import { modulyConfig } from "@/moduly.config";
import { useCart } from "@/components/providers/cart-provider";
import { OrderSummary } from "./order-summary";
import { ShippingSelector } from "./shipping-selector";

export function CheckoutPageClient() {
	const { cartId, items, total, isInitialized, refreshCart } = useCart();

	return (
		<CheckoutForm
			cartId={cartId}
			items={items.map((i) => ({
				variant_id: i.id,
				title: i.title,
				quantity: i.quantity,
				unit_price: i.unitPrice,
				thumbnail: i.thumbnail,
			}))}
			total={total}
			isInitialized={isInitialized}
			refreshCart={refreshCart}
			supportEmail={modulyConfig.email.contactEmail}
			components={{
				ShippingSelector,
				OrderSummary,
			}}
			legalLinks={{
				termsHref: "/regulamin",
				privacyHref: "/polityka-prywatnosci",
			}}
		/>
	);
}
