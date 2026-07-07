import type { Address } from "@/lib/shop-types";
import type { HttpTypes } from "@medusajs/types";
import { clearCheckoutAnalyticsContext } from "@/lib/analytics/checkout-analytics-context";
import { toMinorUnitsFromDecimal } from "@/lib/money-format";
import { getCart } from "./cart";
import { medusa } from "./client";
import { resolveMedusaFetchBase } from "./resolve-fetch-base";

/** Po udanym zamówieniu — blokuje ponowny checkout (wstecz w przeglądarce). */
export const CHECKOUT_COMPLETED_STORAGE_KEY = "moduly_checkout_completed_v1";

/** Kontekst aktywnej sesji P24 — powrót z bramki / brak cart_id w URL. */
export const P24_CART_CONTEXT_KEY = "moduly_p24_cart_context_v1";

export type P24CartContext = {
  cartId: string;
  at: number;
};

export function markP24PaymentStarted(cartId: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: P24CartContext = { cartId, at: Date.now() };
    sessionStorage.setItem(P24_CART_CONTEXT_KEY, JSON.stringify(payload));
  } catch {
    /* prywatny tryb */
  }
}

export function readP24CartContext(): P24CartContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(P24_CART_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<P24CartContext>;
    if (!parsed.cartId?.trim()) return null;
    return { cartId: parsed.cartId.trim(), at: parsed.at ?? 0 };
  } catch {
    return null;
  }
}

export function clearP24CartContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(P24_CART_CONTEXT_KEY);
  } catch {
    /* prywatny tryb */
  }
}

export type CheckoutCompletedPayload = {
  orderId: string;
  displayId?: number;
  at: number;
};

export function markCheckoutCompleted(orderId: string, displayId?: number): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CheckoutCompletedPayload = {
      orderId,
      displayId,
      at: Date.now(),
    };
    sessionStorage.setItem(
      CHECKOUT_COMPLETED_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    /* prywatny tryb */
  }
}

export function clearCheckoutCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_COMPLETED_STORAGE_KEY);
  } catch {
    /* prywatny tryb */
  }
  clearCheckoutAnalyticsContext();
}

export function readCheckoutCompleted(): CheckoutCompletedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_COMPLETED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutCompletedPayload>;
    if (!parsed.orderId) return null;
    return {
      orderId: parsed.orderId,
      displayId: parsed.displayId,
      at: parsed.at ?? 0,
    };
  } catch {
    return null;
  }
}

export type OrderConfirmationOptions = {
  payment?: "bank_transfer";
};

export function redirectToOrderConfirmation(
  orderId: string,
  displayId?: number,
  options?: OrderConfirmationOptions,
): void {
  if (typeof window === "undefined") return;
  const qs = new URLSearchParams({ order_id: orderId });
  if (displayId) qs.set("display_id", String(displayId));
  if (options?.payment === "bank_transfer") {
    qs.set("payment", "bank_transfer");
  }
  window.location.replace(`/checkout/potwierdzenie?${qs.toString()}`);
}

export const SYSTEM_PAYMENT_PROVIDER_ID = "pp_system_default";

/** Nie pozwalamy finalizować pustego lub już zamkniętego koszyka. */
export async function assertCartReadyForCheckout(cartId: string): Promise<void> {
  const cart = await getCart(cartId);
  const items = (cart.items as unknown[] | undefined) ?? [];
  if (items.length === 0) {
    throw new Error("Koszyk jest pusty — dodaj produkty i spróbuj ponownie.");
  }
  if (cart.completed_at) {
    throw new Error("Ten koszyk został już sfinalizowany.");
  }
}

export async function updateCartAddress(
  cartId: string,
  shippingAddress: Address,
  billingAddress?: Address,
) {
  const response = await medusa.store.cart.update(cartId, {
    shipping_address: shippingAddress,
    billing_address: billingAddress ?? shippingAddress,
  });
  return response.cart;
}

export async function setCartEmail(cartId: string, email: string) {
  const response = await medusa.store.cart.update(cartId, { email });
  return response.cart;
}

/**
 * Jeden PUT /store/carts/:id z emailem + adresami.
 * Medusa v2 blokuje cart na czas workflow — dwa osobne updaty sekwencyjnie
 * potrafią się blokować i trwać 10-15s. Łączymy w jeden request.
 */
export async function saveContactDetails(
  cartId: string,
  email: string,
  shippingAddress: Address,
  billingAddress?: Address,
) {
  const response = await medusa.store.cart.update(cartId, {
    email,
    shipping_address: shippingAddress,
    billing_address: billingAddress ?? shippingAddress,
  });
  return response.cart;
}

export async function getShippingOptions(cartId: string) {
  const response = await medusa.store.fulfillment.listCartOptions({ cart_id: cartId });
  return response.shipping_options;
}

/**
 * Odbiór osobisty — `type.code` / `shipping_option_type.code` z API albo nazwa
 * (np. „Odbiór osobisty” z `ensure-moduly-shipping`).
 */
export function isPickupShippingOption(
  o: Record<string, unknown> | undefined,
): boolean {
  if (!o) return false;
  const codeOf = (t: unknown) =>
    String((t as { code?: string } | undefined)?.code ?? "").toLowerCase();
  if (codeOf(o.type) === "pickup") return true;
  if (codeOf(o.shipping_option_type) === "pickup") return true;
  const name = String(o.name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (name.includes("odbior") && name.includes("osobist")) return true;
  return false;
}

function cartOptionsHavePickup(raw: unknown[] | null | undefined): boolean {
  if (!raw?.length) return false;
  return raw.some((o) => isPickupShippingOption(o as Record<string, unknown>));
}

/** Wspólna logika z `ShippingSelector` — kwota z `amount` / `calculated_price` Store API. */
export function normalizeShippingOptionsForDisplay(
  raw: Array<Record<string, unknown>> | null | undefined,
): Array<{ id: string; name: string; price: number; isPickup: boolean }> {
  const list = raw ?? [];
  return list.map((o) => {
    const calc = o.calculated_price as
      | { calculated_amount?: number }
      | undefined;
    const amount =
      Number(o.amount ?? o.price ?? calc?.calculated_amount ?? 0) || 0;
    return {
      id: String(o.id),
      name: (o.name as string | undefined) ?? "Dostawa",
      price: amount,
      isPickup: isPickupShippingOption(o),
    };
  });
}

/**
 * Szacunek koszyka przed wyborem metody: najtańsza opcja **płatna** (kurier),
 * bez odbioru osobistego (`pickup`), żeby min(0, 24.99) nie zerowało podglądu.
 */
export function pickLowestPaidShippingOptionPrice(
  options: Array<{ price: number; isPickup: boolean }>,
): number | null {
  const paid = options.filter((o) => !o.isPickup);
  if (!paid.length) return null;
  return Math.min(...paid.map((o) => o.price));
}

/** @deprecated Użyj `pickLowestPaidShippingOptionPrice` — pickup ma cenę 0. */
export function pickLowestShippingOptionPrice(
  options: Array<{ price: number; isPickup?: boolean }>,
): number | null {
  const normalized = options.map((o) => ({
    price: o.price,
    isPickup: o.isPickup ?? false,
  }));
  return pickLowestPaidShippingOptionPrice(normalized);
}

/**
 * Moduł-level cache promise'a z opcjami dostawy per cartId.
 *
 * Przed prefetchem Step 2 wchodził a opcje ładowały się dopiero ~3,4 s po
 * kliknięciu. Wołamy tę funkcję od razu jak mamy `cartId` (Step 1), a
 * `ShippingSelector` w Step 2 korzysta z tego samego cached promise'a — jeśli
 * prefetch już się
 * skończył, dane są natychmiast. Cache per cartId trzyma do zmiany koszyka.
 *
 * Celowo nie dajemy TTL — promise jest idempotentny (w najgorszym wypadku
 * pokaże dane sprzed kilku sekund, a `selectShippingOption` i tak walidowane
 * jest serwerowo po wyborze).
 */
const shippingOptionsCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getShippingOptions>>>
>();

export function prefetchShippingOptions(cartId: string) {
  if (!cartId) return Promise.resolve([]);
  const cached = shippingOptionsCache.get(cartId);
  if (cached) return cached;
  const promise = (async () => {
    let raw = await getShippingOptions(cartId);
    /**
     * Bootstrap wcześniej tylko przy pustej liście — wtedy istniejące wdrożenia
     * miały wyłącznie DPD i nigdy nie dostawały odbioru. Jeśli brak opcji
     * `pickup`, wołamy `ensure-shipping` ponownie (idempotentnie dokleja brak).
     */
    const list = (raw ?? []) as unknown[];
    if (!list.length || !cartOptionsHavePickup(list)) {
      await ensureModulyShippingBootstrap();
      const refreshed = await getShippingOptions(cartId);
      if (refreshed?.length) raw = refreshed;
    }
    return raw;
  })().catch((e) => {
    shippingOptionsCache.delete(cartId);
    throw e;
  });
  shippingOptionsCache.set(cartId, promise);
  return promise;
}

export function invalidateShippingOptionsCache(cartId?: string) {
  if (cartId) shippingOptionsCache.delete(cartId);
  else shippingOptionsCache.clear();
}

/**
 * Moduł-level cache promise'a z „gotowością płatności" — regionem PL i listą
 * providerów. Tak samo jak przy shipping: wołamy w Step 1, a Step 2→3
 * korzysta z gotowego rezultatu zamiast robić 2 dodatkowe round-tripy
 * (`GET /store/regions` + `GET /store/payment-providers`), które w sumie
 * dodawały ~1,5 s do przejścia na krok płatności.
 *
 * Cache'ujemy do końca sesji — region i lista providerów zmieniają się
 * wyjątkowo rzadko (nowy deploy backendu). Jeśli w kroku 3 brakuje
 * providera dla wybranego cart.regionu, storefront fallbackuje na
 * `ensureModulyPaymentBootstrap()` — ta ścieżka i tak jest idempotentna.
 */
type PaymentReadiness = {
  regionId: string;
  providerId: string;
  /** Wszystkie aktywne providery w regionie (np. pp_system_default, pp_przelewy24_przelewy24). */
  providerIds: string[];
};

/** Pełny id providera Przelewy24 w Medusie: `pp_{provider.id}_{service.identifier}`. */
export const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";

/** Providery widoczne w checkoutcie (reszta ukryta do czasu włączenia). */
export const CHECKOUT_VISIBLE_PROVIDER_IDS = [
  PRZELEWY24_PROVIDER_ID,
  SYSTEM_PAYMENT_PROVIDER_ID,
] as const;

let paymentReadinessPromise: Promise<PaymentReadiness> | null = null;

/**
 * Wybiera domyślnego providera płatności: P24 (płatność od razu) →
 * przelew tradycyjny (`pp_system_default`) → pierwszy dostępny.
 * Fallback jest celowy — awaria/wyłączenie P24 nie może blokować checkoutu,
 * skoro przelew tradycyjny jest pełnoprawną metodą.
 */
function pickPreferredProvider(list: Array<{ id: string }>): string | undefined {
  const p24 = list.find((p) => p.id === PRZELEWY24_PROVIDER_ID);
  if (p24) return p24.id;
  const system = list.find((p) => p.id === SYSTEM_PAYMENT_PROVIDER_ID);
  if (system) return system.id;
  return list[0]?.id;
}

export function prefetchPaymentReadiness(
  getRegionId: () => Promise<string>,
): Promise<PaymentReadiness> {
  if (paymentReadinessPromise) return paymentReadinessPromise;
  paymentReadinessPromise = (async () => {
    const regionId = await getRegionId();
    let providers = await listPaymentProviders(regionId);
    let providerId = pickPreferredProvider(providers);
    if (!providerId) {
      await ensureModulyPaymentBootstrap();
      providers = await listPaymentProviders(regionId);
      providerId = pickPreferredProvider(providers);
    }
    if (!providerId) {
      throw new Error(
        "Brak skonfigurowanych metod płatności. Napisz na kontakt@modulyconcept.pl.",
      );
    }
    return { regionId, providerId, providerIds: providers.map((p) => p.id) };
  })().catch((e) => {
    paymentReadinessPromise = null;
    throw e;
  });
  return paymentReadinessPromise;
}

export function invalidatePaymentReadinessCache() {
  paymentReadinessPromise = null;
}

/**
 * Jednorazowy bootstrap opcji DPD w Medusie (gdy w Adminie jest 0 opcji w strefie).
 * Wywoływane z checkoutu tylko gdy lista opcji jest pusta — idempotentne.
 */
export async function ensureModulyShippingBootstrap(): Promise<{ ok: boolean }> {
  const base = resolveMedusaFetchBase();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  const res = await fetch(`${base}/store/custom/ensure-shipping`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn("[shipping] ensure bootstrap", res.status, body);
    return { ok: false };
  }
  const data = (await res.json()) as { ok?: boolean };
  return { ok: data.ok !== false };
}

/**
 * Pobiera listę payment-providerów aktywnych dla regionu. W trybie testowym
 * oczekujemy przynajmniej `pp_system_default` (rejestrowany przez moduł
 * `@medusajs/medusa/payment`). Gdy lista jest pusta — wywołujący powinien
 * zabootstrapować providera przez `ensureModulyPaymentBootstrap()`.
 */
export async function listPaymentProviders(regionId: string) {
  const { payment_providers } = (await medusa.store.payment.listPaymentProviders(
    { region_id: regionId },
  )) as { payment_providers: Array<{ id: string; is_enabled?: boolean }> };
  return payment_providers.filter((p) => p.is_enabled !== false);
}

/**
 * Idempotentnie dokleja `pp_system_default` do regionów, gdy nie jest podpięty
 * (pierwszy deploy po dodaniu modułu payment do configu Medusy).
 */
export async function ensureModulyPaymentBootstrap(): Promise<{ ok: boolean }> {
  const base = resolveMedusaFetchBase();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  const res = await fetch(`${base}/store/custom/ensure-payment`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn("[payment] ensure bootstrap", res.status, body);
    return { ok: false };
  }
  const data = (await res.json()) as { ok?: boolean };
  return { ok: data.ok !== false };
}

/**
 * Wyzwala mail „potwierdzenie zamówienia" — czeka na wysyłkę (P24 return / checkout).
 * Storefront API → magazyn; fallback na backend Medusa.
 */
export async function notifyOrderPlacedAwait(
	orderId: string,
	snapshot?: CheckoutOrderSnapshot,
): Promise<boolean> {
	if (!orderId) return false;

	try {
		const res = await fetch("/api/checkout/notify-order-placed", {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({
				order_id: orderId,
				...(snapshot
					? {
							snapshot: {
								email: snapshot.email,
								display_id: snapshot.displayId || undefined,
								total: snapshot.total,
								item_total: snapshot.itemTotal,
								shipping_total: snapshot.shippingTotal,
								currency_code: snapshot.currencyCode,
								customer_name: snapshot.customerName,
								address: snapshot.address,
								phone: snapshot.phone,
								shipping_method_name: snapshot.shippingMethodName,
								items: snapshot.items,
							},
						}
					: {}),
			}),
			signal: AbortSignal.timeout(20_000),
		});
		if (res.ok) return true;
		const retryBody = JSON.stringify({
			order_id: orderId,
			...(snapshot
				? {
						snapshot: {
							email: snapshot.email,
							display_id: snapshot.displayId || undefined,
							total: snapshot.total,
							item_total: snapshot.itemTotal,
							shipping_total: snapshot.shippingTotal,
							currency_code: snapshot.currencyCode,
							customer_name: snapshot.customerName,
							address: snapshot.address,
							phone: snapshot.phone,
							shipping_method_name: snapshot.shippingMethodName,
							items: snapshot.items,
						},
					}
				: {}),
		});
		await new Promise((r) => setTimeout(r, 600));
		const retry = await fetch("/api/checkout/notify-order-placed", {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: retryBody,
			signal: AbortSignal.timeout(20_000),
		});
		if (retry.ok) return true;
	} catch (e) {
		console.warn("[mail] notify-order-placed storefront error", e);
	}

	/**
	 * Brak publicznego fallbacku na backendowe `/store/custom/notify-order-placed`
	 * — to endpoint server-to-server (wymaga sekretu). Dostarczenie maila gwarantuje
	 * subscriber `order.placed` (idempotentny) oraz storefrontowy
	 * `/api/checkout/notify-order-placed` powyżej.
	 */
	return false;
}

const CHECKOUT_DRAFT_STORAGE_KEY = "moduly_checkout_draft_v1";

type CheckoutDraftFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
};

function readCheckoutDraftFormData(): CheckoutDraftFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { formData?: Partial<CheckoutDraftFormData> };
    const form = parsed.formData;
    if (!form?.email?.trim()) return null;
    return {
      email: form.email.trim(),
      firstName: form.firstName?.trim() ?? "",
      lastName: form.lastName?.trim() ?? "",
      phone: form.phone?.trim() ?? "",
      address: form.address?.trim() ?? "",
      city: form.city?.trim() ?? "",
      postalCode: form.postalCode?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

function cartAmountToMinor(value: unknown): number {
  return toMinorUnitsFromDecimal(Number(value ?? 0));
}

/**
 * Snapshot z draftu checkoutu + koszyka — działa zanim admin API zwróci zamówienie
 * (typowy scenariusz po powrocie z P24 po wcześniejszej nieudanej płatności).
 */
export async function buildOrderEmailSnapshotFromCheckout(
  order: { id: string; display_id?: number },
  cartId: string,
): Promise<CheckoutOrderSnapshot | undefined> {
  const draft = readCheckoutDraftFormData();
  if (!draft?.email) return undefined;

  let cart: Record<string, unknown> | null = null;
  try {
    cart = await getCart(cartId);
  } catch {
    /* koszyk może być już zamknięty — używamy samego draftu */
  }

  const currency = String(cart?.currency_code ?? "pln").toUpperCase();
  const itemsRaw = (cart?.items as Array<Record<string, unknown>> | undefined) ?? [];
  const items = itemsRaw.map((item) => {
    const unitPrice = cartAmountToMinor(item.unit_price);
    const quantity = Number(item.quantity ?? 1);
    const lineTotal =
      cartAmountToMinor(item.total) ||
      unitPrice * (Number.isFinite(quantity) ? quantity : 1);
    return {
      title: String(item.title ?? item.product_title ?? "Produkt"),
      quantity: Number.isFinite(quantity) ? quantity : 1,
      total: lineTotal,
      thumbnail: (item.thumbnail as string | null | undefined) ?? null,
    };
  });

  const itemTotalFromCart = cartAmountToMinor(cart?.item_subtotal ?? cart?.subtotal);
  const itemTotal =
    itemTotalFromCart ||
    items.reduce((sum, item) => sum + item.total, 0);
  const shippingTotal = cartAmountToMinor(cart?.shipping_total);
  const total =
    cartAmountToMinor(cart?.total) || itemTotal + shippingTotal;

  const shippingMethods = cart?.shipping_methods as
    | Array<{ name?: string | null }>
    | undefined;

  const address = [
    draft.address,
    [draft.postalCode, draft.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    email: draft.email,
    displayId: order.display_id ?? 0,
    total,
    itemTotal,
    shippingTotal,
    currencyCode: currency,
    customerName: [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim(),
    address,
    phone: draft.phone,
    shippingMethodName: shippingMethods?.[0]?.name ?? null,
    items,
  };
}

export type CheckoutOrderSnapshot = {
	email: string;
	displayId: number;
	total: number;
	itemTotal?: number;
	shippingTotal?: number;
	currencyCode?: string;
	customerName?: string;
	address?: string;
	phone?: string;
	shippingMethodName?: string | null;
	items?: Array<{
		title: string;
		quantity: number;
		total: number;
		thumbnail?: string | null;
	}>;
};

/**
 * Fire-and-forget — tylko gdy redirect nie następuje od razu (legacy).
 */
export function notifyOrderPlaced(orderId: string): void {
  if (!orderId) return;
  void notifyOrderPlacedAwait(orderId).catch(() => undefined);
}

/**
 * Zapisuje uwagi klienta w metadata zamówienia (fire-and-forget).
 * Wołane zaraz po `completeCart`, żeby magazyn widział tekst z checkoutu.
 */
export function attachOrderNotes(orderId: string, orderNotes: string): void {
  const notes = orderNotes.trim();
  if (!orderId || !notes) return;

  const base = resolveMedusaFetchBase();
  const url = `${base}/store/custom/attach-order-notes`;
  const payload = JSON.stringify({ order_id: orderId, order_notes: notes });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  void fetch(url, {
    method: "POST",
    headers,
    body: payload,
    keepalive: true,
  }).catch((e) => {
    console.warn("[checkout] attach-order-notes fire-and-forget error", e);
  });
}

/** Mail z danymi do przelewu — szablon `bank_transfer_pending` z magazynu. */
export async function notifyBankTransferPending(input: {
  orderId: string;
  email: string;
  displayId?: number;
  totalMinor?: number;
  itemTotalMinor?: number;
  shippingTotalMinor?: number;
  paymentProviderId?: string;
  customerName?: string;
  items?: Array<{
    title: string;
    quantity: number;
    totalMinor: number;
    thumbnail?: string | null;
  }>;
}): Promise<boolean> {
  const { orderId, email } = input;
  if (!orderId || !email.trim()) return false;
  if (typeof window === "undefined") return false;

  const providerId = input.paymentProviderId ?? SYSTEM_PAYMENT_PROVIDER_ID;

  if (input.displayId != null && input.totalMinor != null) {
    try {
      const res = await fetch("/api/checkout/send-bank-transfer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          email: email.trim(),
          display_id: input.displayId,
          total: toMinorUnitsFromDecimal(input.totalMinor),
          item_total:
            input.itemTotalMinor != null
              ? toMinorUnitsFromDecimal(input.itemTotalMinor)
              : undefined,
          shipping_total:
            input.shippingTotalMinor != null
              ? toMinorUnitsFromDecimal(input.shippingTotalMinor)
              : undefined,
          currency_code: "PLN",
          customer_name: input.customerName,
          payment_provider_id: providerId,
          items: input.items?.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            total: toMinorUnitsFromDecimal(item.totalMinor),
            thumbnail: item.thumbnail ?? null,
          })),
        }),
      });
      if (res.ok) return true;
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn("[mail] send-bank-transfer-email (magazyn)", res.status, body);
    } catch (e) {
      console.warn("[mail] send-bank-transfer-email error", e);
    }
  }

  /**
   * Brak publicznego fallbacku na backendowe `/store/custom/notify-bank-transfer`
   * — to endpoint server-to-server (wymaga sekretu). Mail z danymi do przelewu
   * dostarcza subscriber `order.placed` (gałąź bank-transfer) oraz storefrontowy
   * `/api/checkout/send-bank-transfer-email` powyżej.
   */
  return false;
}

export async function selectShippingOption(cartId: string, optionId: string) {
  const response = await medusa.store.cart.addShippingMethod(cartId, {
    option_id: optionId,
  });
  return response.cart;
}

/**
 * Ekspresowe przygotowanie checkoutu w 1 HTTP round-tripie:
 *   addShippingMethod + createPaymentCollection (jeśli brak) +
 *   createPaymentSession (jeśli brak dla providera).
 *
 * Oszczędza ~300-500 ms (dwa round-tripy zamiast jednego) w kroku 2 → 3.
 * Backend endpoint jest idempotentny — bezpieczne retry.
 *
 * Nie zwraca pełnego `cart` — storefront i tak odświeża go przez
 * `getCart(cartId)`; dzięki temu backend unika kapryśnego joina `region.*`
 * w remoteQuery, a odpowiedź jest szybka (pole `paymentCollectionId`).
 */
export async function prepareCheckout(
  cartId: string,
  optionId: string,
  providerId: string,
  orderNotes?: string,
  analytics?: {
    consentAnalytics?: boolean;
    consentMarketing?: boolean;
    phDistinctId?: string;
    phSessionId?: string;
    trafficSource?: string;
  },
  invoice?: {
    companyName?: string;
    nip?: string;
  },
): Promise<{ paymentCollectionId?: string }> {
  const base = resolveMedusaFetchBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  const res = await fetch(`${base}/store/custom/prepare-checkout`, {
    method: "POST",
    headers,
    // Bez timeoutu wiszący fetch (słaba sieć / captive portal) blokował
    // przycisk „Zamawiam i płacę" na czas browserowego timeoutu (minuty).
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      cart_id: cartId,
      option_id: optionId,
      provider_id: providerId,
      ...(orderNotes ? { order_notes: orderNotes } : {}),
      ...(invoice?.companyName ? { company_name: invoice.companyName } : {}),
      ...(invoice?.nip ? { nip: invoice.nip } : {}),
      ...(analytics?.consentAnalytics != null
        ? { consent_analytics: analytics.consentAnalytics }
        : {}),
      ...(analytics?.consentMarketing != null
        ? { consent_marketing: analytics.consentMarketing }
        : {}),
      ...(analytics?.phDistinctId
        ? { ph_distinct_id: analytics.phDistinctId }
        : {}),
      ...(analytics?.phSessionId
        ? { ph_session_id: analytics.phSessionId }
        : {}),
      ...(analytics?.trafficSource
        ? { traffic_source: analytics.trafficSource }
        : {}),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      type?: string;
    };
    const err = new Error(
      body.message ?? `prepare-checkout ${res.status}`,
    ) as Error & { status?: number; type?: string };
    err.status = res.status;
    err.type = body.type;
    throw err;
  }
  const data = (await res.json()) as {
    ok?: boolean;
    payment_collection_id?: string;
  };
  return { paymentCollectionId: data.payment_collection_id };
}

/**
 * Medusa SDK v2 wymaga świeżego obiektu cart (nie ID), żeby policzyć tax/total
 * dla sesji płatności. Wcześniej robiliśmy `cart.retrieve` wewnątrz — w
 * checkoutcie to był zbędny round-trip, bo `selectShippingOption` tuż przed
 * tym zwraca już świeży cart (po doliczeniu dostawy). Pozwalamy przekazać
 * go przez trzeci argument; fallback `retrieve` zostaje dla wywołań bez
 * świeżego kontekstu (np. z zewnątrz / testów).
 */
export async function initPaymentSession(
  cartId: string,
  providerId: string,
  freshCart?: HttpTypes.StoreCart,
) {
  const cart = freshCart ?? (await medusa.store.cart.retrieve(cartId)).cart;
  const response = await medusa.store.payment.initiatePaymentSession(
    cart,
    { provider_id: providerId },
  );
  return response;
}

/**
 * Inicjuje sesję płatności Przelewy24 i zwraca URL panelu P24, na który
 * przekierowujemy klienta. Po opłaceniu P24:
 *   1) wysyła notyfikację na `urlStatus` → backend `/hooks/payment/...`
 *      weryfikuje transakcję i oznacza płatność jako opłaconą,
 *   2) przekierowuje klienta na `urlReturn` (/checkout/przelewy24/return),
 *      gdzie finalizujemy koszyk (`completeCart`) i tworzymy zamówienie.
 */
type P24SessionLike = {
  provider_id?: string;
  status?: string;
  data?: { redirect_url?: string };
};

type CartWithP24Sessions = {
  payment_collection?: {
    amount?: number | null;
    payment_sessions?: (P24SessionLike & { amount?: number | null })[] | null;
  } | null;
};

/**
 * Tolerancja porównania kwot. Store API zwraca kwoty w jednostkach głównych
 * (float), więc unikamy pułapki floatów przy równości (0.01 = 1 grosz).
 */
const P24_AMOUNT_EPSILON = 0.005;

/**
 * Aktywna sesja P24 z gotowym URL bramki, którą można reużyć. „Pending” =
 * transakcja zarejestrowana w P24, klient jeszcze nie zapłacił. Reużycie
 * chroni przed duplikatami transakcji w P24 przy reloadzie / wielokrotnym
 * kliknięciu „Zamawiam i płacę”.
 *
 * SECURITY/FINANSE: reużywamy sesji TYLKO gdy jej kwota zgadza się z aktualną
 * kwotą payment_collection (= total koszyka). Bez tego klient, który zmienił
 * koszyk po zarejestrowaniu transakcji (inna ilość / dostawa), płacił starą
 * kwotę z bramki P24, a zamówienie powstawało na nową — rozjazd finansowy.
 */
function findReusableP24RedirectUrl(cart: CartWithP24Sessions): string | null {
  const collection = cart.payment_collection;
  const sessions = collection?.payment_sessions ?? [];
  const expectedAmount =
    typeof collection?.amount === "number" ? collection.amount : null;

  for (const session of sessions) {
    if (session.provider_id !== PRZELEWY24_PROVIDER_ID) continue;
    if (session.status && session.status !== "pending") continue;
    const url = session.data?.redirect_url;
    if (typeof url !== "string" || !url.trim()) continue;

    // Nie reużywaj sesji zarejestrowanej na inną kwotę niż aktualny total.
    if (
      expectedAmount !== null &&
      typeof session.amount === "number" &&
      Math.abs(session.amount - expectedAmount) > P24_AMOUNT_EPSILON
    ) {
      continue;
    }
    return url;
  }
  return null;
}

const P24_SESSION_FIELDS =
  "id,email,payment_collection.id,payment_collection.amount,payment_collection.payment_sessions.provider_id,payment_collection.payment_sessions.status,payment_collection.payment_sessions.amount,payment_collection.payment_sessions.data";

export async function initPrzelewy24Redirect(
  cartId: string,
  freshCart?: HttpTypes.StoreCart,
): Promise<string> {
  const cart =
    freshCart ??
    (
      await medusa.store.cart.retrieve(cartId, { fields: P24_SESSION_FIELDS })
    ).cart;

  // Idempotencja: reużyj istniejącej, nieopłaconej sesji P24 (ten sam URL bramki)
  // zamiast rejestrować nową transakcję — bez tego każdy reload /start tworzył
  // duplikat w panelu Przelewy24.
  const reusable = findReusableP24RedirectUrl(cart as CartWithP24Sessions);
  if (reusable) return reusable;

  const response = (await medusa.store.payment.initiatePaymentSession(cart, {
    provider_id: PRZELEWY24_PROVIDER_ID,
    data: {
      cart_id: cartId,
      email: (cart as { email?: string }).email ?? "",
    },
  })) as {
    payment_collection?: {
      payment_sessions?: Array<{
        provider_id: string;
        data?: { redirect_url?: string };
      }>;
    };
  };

  const session = response.payment_collection?.payment_sessions?.find(
    (s) => s.provider_id === PRZELEWY24_PROVIDER_ID,
  );
  const redirectUrl = session?.data?.redirect_url;
  if (!redirectUrl) {
    throw new Error(
      "Nie udało się przygotować płatności Przelewy24. Spróbuj ponownie.",
    );
  }
  return redirectUrl;
}

export type P24ReturnStatus = "paid" | "pending" | "failed";

export type P24ReturnStatusResponse = {
  status: P24ReturnStatus;
  email?: string;
  retry_url?: string;
  p24_session_id?: string;
  p24_status?: number | null;
  email_sent?: boolean;
};

/** Sprawdza stan płatności P24 po powrocie klienta z bramki. */
export async function fetchP24ReturnStatus(
  cartId: string,
  options?: { allowFailedOnZero?: boolean; sendFailedEmail?: boolean },
): Promise<P24ReturnStatusResponse | null> {
  const base = resolveMedusaFetchBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  const res = await fetch(`${base}/store/custom/p24-return-status`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cart_id: cartId,
      allow_failed_on_zero: options?.allowFailedOnZero ?? false,
      send_failed_email: options?.sendFailedEmail ?? false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;
  return (await res.json()) as P24ReturnStatusResponse;
}

/** Rejestruje nową sesję P24 i zwraca URL bramki płatności. */
export async function retryPrzelewy24Payment(cartId: string): Promise<string> {
  const base = resolveMedusaFetchBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  const res = await fetch(`${base}/store/custom/p24-retry-payment`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cartId }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      body.message ?? "Nie udało się przygotować ponownej płatności.",
    );
  }

  const data = (await res.json()) as { redirect_url?: string };
  if (!data.redirect_url) {
    throw new Error("Nie udało się przygotować ponownej płatności.");
  }
  return data.redirect_url;
}

/** Wysyła mail o nieudanej płatności (szablon magazynu). Fire-and-forget. */
export function buildP24RetryUrl(cartId: string): string {
  const path = `/checkout/p24/retry?cart_id=${encodeURIComponent(cartId)}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_VERCEL_URL?.replace(/\/$/, "");
  return site ? `${site}${path}` : path;
}

/** Fallback wysyłki maila z klienta (główna ścieżka: backend send_failed_email). */
export function notifyPaymentFailed(
  cartId: string,
  retryUrl: string,
  p24SessionId?: string,
): void {
  void fetch("/api/checkout/send-payment-failed-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      cart_id: cartId,
      retry_url: retryUrl,
      ...(p24SessionId ? { p24_session_id: p24SessionId } : {}),
    }),
  }).catch(() => undefined);
}

/** Woła backend — status failed + wysyłka maila (dedupe per sesja P24). */
export async function triggerPaymentFailedEmail(
  cartId: string,
  retryUrl: string,
): Promise<void> {
  const status = await fetchP24ReturnStatus(cartId, {
    allowFailedOnZero: true,
    sendFailedEmail: true,
  }).catch(() => null);

  if (status?.email_sent) return;

  notifyPaymentFailed(
    cartId,
    status?.retry_url ?? retryUrl,
    status?.p24_session_id,
  );
}

export type CompleteCartResponse =
  | { type: "order"; order: { id: string; display_id?: number } }
  | {
      type: "cart";
      cart: Record<string, unknown>;
      error?: { message?: string; name?: string; type?: string; code?: string };
    };

/** Rozpoznaje typowy dla Medusy v2 komunikat „Cart is already completed". */
export function isCartAlreadyCompletedError(e: unknown): boolean {
  const msg =
    (e as { message?: string } | null)?.message ??
    (typeof e === "string" ? e : "") ??
    "";
  return /already\s+completed/i.test(msg);
}

/**
 * Zamienia surowy błąd HTTP z Medusy na sensowny, przetłumaczony komunikat
 * (Safari pokazywało generic „An unknown error occurred" bez kontekstu).
 */
export function describeMedusaError(e: unknown, fallback: string): string {
  if (!e) return fallback;
  const raw = e as Record<string, unknown>;
  const message =
    (raw.message as string | undefined) ??
    (raw.error as { message?: string } | undefined)?.message ??
    "";
  const type = (raw.type as string | undefined) ?? "";
  const code = (raw.code as string | undefined) ?? "";
  const status =
    (raw.status as number | undefined) ??
    ((raw.response as { status?: number } | undefined)?.status) ??
    0;
  if (isCartAlreadyCompletedError(e)) {
    return "Koszyk został już sfinalizowany. Zacznij od nowa.";
  }
  /**
   * „An unknown error occurred" to generyczny tekst z Medusa SDK gdy upstream
   * zwrócił 500 bez szczegółów (np. zakleszczenie locka w `acquire-lock-step`
   * po cold starcie Railway). Pokazujemy userowi realny komunikat po polsku
   * z prośbą o ponowienie.
   */
  const looksGeneric =
    !message || /^an unknown error occurred\.?$/i.test(message.trim());
  if (
    looksGeneric &&
    (status >= 500 || status === 0) &&
    !(type || code)
  ) {
    return "Chwilowy problem z serwerem. Poczekaj 10 sekund i spróbuj jeszcze raz — Twoje dane zostały zachowane.";
  }
  if (message) return message;
  if (type || code) return `${type || "error"}${code ? ` (${code})` : ""}`;
  return fallback;
}

/**
 * Harmonogram ponowień przy 409/conflict. Exponential backoff zamiast stałego
 * 2500 ms × 4 = 10 s spinner w najgorszym razie. Teraz pierwszy retry już po
 * 500 ms (typowy czas domknięcia poprzedniego workflow `completeCart`), a
 * worst case to 500 + 1000 + 2000 + 4000 = 7,5 s z 4 próbami.
 */
const COMPLETE_CART_BACKOFF_MS = [500, 1000, 2000, 4000];

/**
 * `cart.complete` potrafi zwrócić 409 „conflicted with another request…"
 * gdy poprzednia próba wciąż się wykonuje (np. długi cold start Railway).
 * Ponawiamy kilka razy z rosnącym odstępem — każde kolejne wywołanie z tym
 * samym Idempotency-Key zwraca stan z poprzedniej próby, więc to bezpieczne.
 *
 * `opts.delayMs` zostaje dla wstecznej kompatybilności z testami — gdy jest
 * podane, używamy stałego odstępu (ułatwia asercje w unit testach).
 */
export async function completeCart(
  cartId: string,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<CompleteCartResponse> {
  const retries = opts.retries ?? COMPLETE_CART_BACKOFF_MS.length;
  const fixedDelay = opts.delayMs;
  let lastErr: unknown = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = (await medusa.store.cart.complete(cartId)) as CompleteCartResponse;
      if (result.type === "cart" && (result.error?.message || result.error?.code)) {
        console.warn("[checkout] complete→cart", result.error, result.cart);
      }
      return result;
    } catch (e: unknown) {
      lastErr = e;
      const status =
        (e as { status?: number }).status ??
        (e as { response?: { status?: number } }).response?.status ??
        0;
      const msg = (e as { message?: string }).message ?? "";
      const isConflict =
        status === 409 ||
        /idempotency/i.test(msg) ||
        /conflict/i.test(msg);
      /**
       * Retriujemy TYLKO na 409 (prawdziwy conflict z Idempotency-Key) —
       * tam kolejne wołanie zwraca cached state. 500 oznacza że serwerowy
       * workflow utknął; retry wali w ten sam zakleszczony stan, tylko
       * wydłuża UX i nic nie naprawia (objaw sprzed wdrożenia
       * workflow-engine-redis, teraz nie powinien wystąpić).
       */
      const shouldRetry = isConflict && !isCartAlreadyCompletedError(e);
      if (shouldRetry && i < retries) {
        const wait =
          fixedDelay ??
          COMPLETE_CART_BACKOFF_MS[Math.min(i, COMPLETE_CART_BACKOFF_MS.length - 1)];
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("completeCart: przekroczono limit prób");
}
