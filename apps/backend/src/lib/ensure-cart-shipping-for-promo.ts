import type { MedusaContainer } from "@medusajs/framework/types";
import {
	ContainerRegistrationKeys,
	remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import {
	addShippingMethodToCartWorkflow,
	listShippingOptionsForCartWorkflow,
} from "@medusajs/medusa/core-flows";

type ShippingOptionRow = Record<string, unknown>;

function isPickupShippingOption(option: ShippingOptionRow): boolean {
	const codeOf = (t: unknown) =>
		String((t as { code?: string } | undefined)?.code ?? "").toLowerCase();
	if (codeOf(option.type) === "pickup") return true;
	if (codeOf(option.shipping_option_type) === "pickup") return true;
	const name = String(option.name ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "");
	return name.includes("odbior") && name.includes("osobist");
}

function shippingOptionPrice(option: ShippingOptionRow): number {
	const calc = option.calculated_price as { calculated_amount?: number } | undefined;
	return Number(option.amount ?? option.price ?? calc?.calculated_amount ?? 0) || 0;
}

function pickCheapestPaidShippingOptionId(
	options: ShippingOptionRow[],
): string | null {
	const paid = options.filter((option) => !isPickupShippingOption(option));
	if (!paid.length) return null;
	const cheapest = paid.reduce((best, option) =>
		shippingOptionPrice(option) < shippingOptionPrice(best) ? option : best,
	);
	return String(cheapest.id ?? "");
}

/**
 * Promocje na `shipping_methods` wymagają metody dostawy w koszyku.
 * Dodaje najtańszą płatną opcję (bez odbioru osobistego), jeśli koszyk jest bez shippingu.
 */
export async function ensureCartShippingForPromo(
	scope: MedusaContainer,
	cartId: string,
): Promise<void> {
	const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
	const cartQuery = remoteQueryObjectFromString({
		entryPoint: "cart",
		variables: { filters: { id: cartId } },
		fields: ["id", "shipping_methods.id"],
	});
	const [cart] = (await remoteQuery(cartQuery)) as Array<{
		shipping_methods?: Array<{ id?: string }> | null;
	}>;
	const methods = cart?.shipping_methods ?? [];
	if (Array.isArray(methods) && methods.length > 0) return;

	const { result: shippingOptions } = await listShippingOptionsForCartWorkflow(scope).run({
		input: { cart_id: cartId },
	});
	const optionId = pickCheapestPaidShippingOptionId(
		(shippingOptions ?? []) as ShippingOptionRow[],
	);
	if (!optionId) return;

	await addShippingMethodToCartWorkflow(scope).run({
		input: {
			cart_id: cartId,
			options: [{ id: optionId }],
		},
	});
}

export async function promotionTargetsShipping(
	scope: MedusaContainer,
	promotionIds: string[],
): Promise<boolean> {
	if (promotionIds.length === 0) return false;
	const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
	for (const id of promotionIds) {
		const promoQuery = remoteQueryObjectFromString({
			entryPoint: "promotion",
			variables: { filters: { id } },
			fields: ["id", "application_method.target_type"],
		});
		const rows = (await remoteQuery(promoQuery)) as Array<{
			application_method?: { target_type?: string } | null;
		}>;
		if (rows[0]?.application_method?.target_type === "shipping_methods") {
			return true;
		}
	}
	return false;
}
