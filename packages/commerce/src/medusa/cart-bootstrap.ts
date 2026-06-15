import * as cartApi from "./cart";
import { isAbortedFetchError, isTransientMedusaError, sleep } from "./transient-error";

export const CART_ID_STORAGE_KEY = "moduly_cart_id";

const BOOTSTRAP_RETRY_DELAYS_MS = [0, 600, 1500];

let inflightBootstrap: Promise<Record<string, unknown> | null> | null = null;
let cachedSessionCart: Record<string, unknown> | null = null;

async function tryBootstrapOnce(): Promise<Record<string, unknown> | null> {
	const savedId =
		typeof window !== "undefined" ? localStorage.getItem(CART_ID_STORAGE_KEY) : null;

	if (savedId) {
		try {
			const existing = await cartApi.getCart(savedId);
			if (existing.completed_at) {
				localStorage.removeItem(CART_ID_STORAGE_KEY);
			} else {
				return existing;
			}
		} catch {
			localStorage.removeItem(CART_ID_STORAGE_KEY);
		}
	}

	const newCart = await cartApi.createCart();
	localStorage.setItem(CART_ID_STORAGE_KEY, newCart.id as string);
	return newCart;
}

/**
 * Jedna inicjalizacja koszyka na sesję — deduplikuje równoległe mounty
 * (React Strict Mode) i ponawia przy chwilowych błędach sieci.
 */
export async function bootstrapCartSession(): Promise<Record<string, unknown> | null> {
	if (cachedSessionCart) {
		return cachedSessionCart;
	}

	if (inflightBootstrap) {
		return inflightBootstrap;
	}

	inflightBootstrap = (async () => {
		let lastError: unknown;
		for (let attempt = 0; attempt < BOOTSTRAP_RETRY_DELAYS_MS.length; attempt++) {
			const pause = BOOTSTRAP_RETRY_DELAYS_MS[attempt] ?? 0;
			if (pause > 0) {
				await sleep(pause);
			}
			try {
				const cart = await tryBootstrapOnce();
				if (cart) {
					cachedSessionCart = cart;
				}
				return cart;
			} catch (e) {
				lastError = e;
				if (isAbortedFetchError(e)) {
					return null;
				}
				const canRetry =
					attempt < BOOTSTRAP_RETRY_DELAYS_MS.length - 1 &&
					isTransientMedusaError(e);
				if (canRetry) {
					continue;
				}
				throw e;
			}
		}
		throw lastError;
	})().finally(() => {
		inflightBootstrap = null;
	});

	return inflightBootstrap;
}

/** Czyści cache sesji — wyłącznie w testach Vitest. */
export function resetCartBootstrapCacheForTests(): void {
	cachedSessionCart = null;
	inflightBootstrap = null;
}
