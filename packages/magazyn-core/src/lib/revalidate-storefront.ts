import "server-only";

import { serverEnv } from "../env";

const DEFAULT_TAGS = ["medusa-products", "medusa-categories", "global-product-config", "magazyn-content"];

/**
 * Unieważnia cache storefrontu po mutacji produktu w Magazynie.
 * Działa tak samo jak subscriber `product-revalidate` w backendzie Medusy.
 */
export async function revalidateStorefrontMedusaCache(
	tags: string[] = DEFAULT_TAGS,
): Promise<void> {
	const secret = serverEnv.medusaRevalidateSecret;
	if (!secret) return;

	const url = serverEnv.storefrontRevalidateUrl ?? `${serverEnv.siteUrl}/api/revalidate/medusa`;

	try {
		await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-webhook-secret": secret,
			},
			body: JSON.stringify({ tags }),
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		/* best-effort — lokalny revalidateTag i tak działa na tej instancji */
	}
}
