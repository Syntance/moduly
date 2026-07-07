import { getCart } from "./cart";
import { EXPRESS_FEE_SHIPPING_METHOD_NAME } from "@/lib/checkout/express-fee";
import {
	normalizeShippingOptionsForDisplay,
	pickLowestPaidShippingOptionPrice,
	prefetchShippingOptions,
	selectShippingOption,
} from "./checkout";

/**
 * Promocje darmowej dostawy (target: shipping_methods) w Medusie wymagają
 * przypiętej metody dostawy — inaczej kod się nie zapisuje.
 */
export async function ensureCartShippingForPromo(cartId: string): Promise<void> {
	const cart = (await getCart(cartId)) as Record<string, unknown>;
	const methods = cart.shipping_methods;
	// Metoda-dopłata express nie jest kurierem — nie liczy się jako wybór dostawy.
	const courierMethods = Array.isArray(methods)
		? (methods as Array<{ name?: string | null }>).filter(
				(m) => (m.name ?? "").trim() !== EXPRESS_FEE_SHIPPING_METHOD_NAME,
			)
		: [];
	if (courierMethods.length > 0) return;

	const raw = await prefetchShippingOptions(cartId);
	const options = normalizeShippingOptionsForDisplay(
		raw as unknown as Array<Record<string, unknown>>,
	);
	const price = pickLowestPaidShippingOptionPrice(options);
	if (price === null) return;

	const cheapest = options
		.filter((option) => !option.isPickup && option.price === price)
		.at(0);
	if (!cheapest) return;

	await selectShippingOption(cartId, cheapest.id);
}
