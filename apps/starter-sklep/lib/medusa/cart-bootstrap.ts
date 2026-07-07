import * as cartApi from "./cart";
import { isAbortedFetchError, isTransientMedusaError, sleep } from "./transient-error";

const CART_ID_KEY = "moduly_cart_id";
const BOOTSTRAP_RETRY_DELAYS_MS = [0, 600, 1500];

/**
 * Cache chroni WYŁĄCZNIE przed podwójnym mountem (React Strict Mode) —
 * dlatego krótki TTL. Bez TTL `refreshCart()` (checkout: zmiana dostawy z
 * promo, finalizacja zamówienia) dostawał snapshot z momentu załadowania
 * strony i nadpisywał nim świeży stan — pozycje koszyka „migotały" między
 * starą a nową zawartością.
 */
const SESSION_CACHE_TTL_MS = 2_000;

let inflightBootstrap: Promise<Record<string, unknown> | null> | null = null;
let cachedSessionCart: Record<string, unknown> | null = null;
let cachedSessionCartAt = 0;

async function tryBootstrapOnce(): Promise<Record<string, unknown> | null> {
  const savedId =
    typeof window !== "undefined" ? localStorage.getItem(CART_ID_KEY) : null;

  if (savedId) {
    let existing: Record<string, unknown> | null = null;
    try {
      existing = (await cartApi.getCart(savedId)) as unknown as Record<
        string,
        unknown
      >;
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 0;
      if (status === 404) {
        // Koszyk nie istnieje w Medusie — usuń stary ID i utwórz nowy.
        localStorage.removeItem(CART_ID_KEY);
      } else {
        // Błąd sieciowy / 503 (Railway cold start) / timeout — NIE czyść ID.
        // bootstrapCartSession ponowi próbę; przy kolejnym ładowaniu strony
        // koszyk będzie ponownie dostępny. Bez tego każdy chwilowy restart
        // backendu opróżniał koszyk klientowi.
        throw e;
      }
    }

    if (existing !== null) {
      if (existing.completed_at) {
        // Koszyk został już opłacony — usuń ID i zaczynaj od nowa.
        localStorage.removeItem(CART_ID_KEY);
      } else {
        return existing;
      }
    }
  }

  const newCart = (await cartApi.createCart()) as unknown as Record<
    string,
    unknown
  >;
  localStorage.setItem(CART_ID_KEY, newCart.id as string);
  return newCart;
}

/**
 * Jedna inicjalizacja koszyka na sesję — deduplikuje równoległe mounty
 * (React Strict Mode) i ponawia przy chwilowych błędach sieci.
 */
export async function bootstrapCartSession(): Promise<Record<
  string,
  unknown
> | null> {
  if (
    cachedSessionCart &&
    Date.now() - cachedSessionCartAt < SESSION_CACHE_TTL_MS
  ) {
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
          cachedSessionCartAt = Date.now();
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
  cachedSessionCartAt = 0;
  inflightBootstrap = null;
}
