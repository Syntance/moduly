import { medusa } from "./client";
import { getPolishRegionId } from "./region";
import {
	cartFieldsSearchParams,
	CART_FIELDS_QUERY,
	storeApiFetch,
} from "./store-fetch";
import { resolveMedusaFetchBase } from "./resolve-fetch-base";
import { withMedusaTimeout } from "./with-timeout";

const CART_RETRIEVE_QUERY = {
	fields: CART_FIELDS_QUERY,
};

async function parseCartResponse(res: Response): Promise<Record<string, unknown>> {
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { message?: string };
		throw new Error(err.message ?? `cart API HTTP ${res.status}`);
	}
	const data = (await res.json()) as { cart: Record<string, unknown> };
	return data.cart;
}

export async function createCart() {
	const params = cartFieldsSearchParams();
	const res = await storeApiFetch(`/store/carts?${params}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ region_id: await getPolishRegionId() }),
	});
	return parseCartResponse(res);
}

export async function getCart(cartId: string) {
	const params = cartFieldsSearchParams();
	const res = await storeApiFetch(`/store/carts/${cartId}?${params}`);
	return parseCartResponse(res);
}

export async function addLineItem(
	cartId: string,
	variantId: string,
	quantity: number,
	metadata?: Record<string, string>,
) {
	if (metadata?.certificate_stand === "true") {
		const base = resolveMedusaFetchBase();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
				? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
				: {}),
		};
		const res = await fetch(`${base}/store/custom/certificate-line-item`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				cart_id: cartId,
				variant_id: variantId,
				quantity,
				metadata,
			}),
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { message?: string };
			throw new Error(body.message ?? `certificate-line-item ${res.status}`);
		}
		const data = (await res.json()) as { cart: unknown };
		return data.cart;
	}

	const response = await withMedusaTimeout(
		medusa.store.cart.createLineItem(
			cartId,
			{
				variant_id: variantId,
				quantity,
				...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
			},
			CART_RETRIEVE_QUERY,
		),
		30_000,
		"cart.createLineItem",
	);
	return response.cart;
}

export async function updateLineItem(
	cartId: string,
	lineItemId: string,
	quantity: number,
) {
	const response = await withMedusaTimeout(
		medusa.store.cart.updateLineItem(
			cartId,
			lineItemId,
			{
				quantity,
			},
			CART_RETRIEVE_QUERY,
		),
		30_000,
		"cart.updateLineItem",
	);
	return response.cart;
}

export async function removeLineItem(cartId: string, lineItemId: string) {
	const response = await withMedusaTimeout(
		medusa.store.cart.deleteLineItem(cartId, lineItemId),
		30_000,
		"cart.deleteLineItem",
	);
	return response;
}

export async function applyPromotionCode(cartId: string, code: string) {
	const response = await withMedusaTimeout(
		medusa.store.cart.update(
			cartId,
			{
				promo_codes: [code],
			},
			CART_RETRIEVE_QUERY,
		),
		30_000,
		"cart.update",
	);
	return response.cart;
}

/**
 * Zapis metadanych koszyka — fire-and-forget z retry.
 */
export async function updateCartMetadata(
	cartId: string,
	metadataPatch: Record<string, string>,
): Promise<unknown | null> {
	const base = resolveMedusaFetchBase();

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
		...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
			? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
			: {}),
	};

	const expressOnly =
		Object.keys(metadataPatch).length === 1 && "express_delivery" in metadataPatch;

	if (expressOnly) {
		try {
			const expressRes = await fetch(`${base}/store/custom/cart-express`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					cart_id: cartId,
					express_delivery: metadataPatch.express_delivery === "true",
				}),
				signal: AbortSignal.timeout(30_000),
			});
			if (expressRes.ok) {
				const data = (await expressRes.json()) as { cart?: unknown };
				if (data.cart) return data.cart;
			}
		} catch {
			/* endpoint nie dostępny — fallback niżej */
		}
	}

	const DELAYS = [0, 800, 2000];
	for (let attempt = 0; attempt < DELAYS.length; attempt++) {
		if (DELAYS[attempt]) {
			await new Promise((r) => setTimeout(r, DELAYS[attempt]));
		}
		try {
			const res = await fetch(`${base}/store/carts/${cartId}`, {
				method: "POST",
				headers,
				body: JSON.stringify({ metadata: metadataPatch }),
				signal: AbortSignal.timeout(30_000),
			});
			if (res.ok) {
				const data = (await res.json()) as { cart?: unknown };
				return data.cart ?? null;
			}
			if (res.status < 500) return null;
		} catch {
			/* sieć / timeout — retry */
		}
	}

	console.warn("[cart] updateCartMetadata: 3 próby nieudane, metadata nie zapisana na serwerze.");
	return null;
}
