import type { Address, CompleteCartResponse } from "@moduly/types";
import type { HttpTypes } from "@medusajs/types";
import { toMinorUnitsFromDecimal } from "../format";
import {
	pickPreferredProvider,
	PRZELEWY24_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
} from "../payments/providers";
import { getCart } from "./cart";
import { medusa } from "./client";
import { resolveMedusaFetchBase } from "./resolve-fetch-base";

export {
	pickPreferredProvider,
	PRZELEWY24_PROVIDER_ID,
	STRIPE_PROVIDER_ID,
	TPAY_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
	PRODUCTION_PAYMENT_PROVIDER_IDS,
	isProductionProvider,
} from "../payments/providers";

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

export type CheckoutPaths = {
	confirmation: string;
	cart: string;
	p24Start: string;
};

export const defaultCheckoutPaths: CheckoutPaths = {
	confirmation: "/checkout/potwierdzenie",
	cart: "/koszyk",
	p24Start: "/checkout/przelewy24/start",
};

export function redirectToOrderConfirmation(
	orderId: string,
	displayId?: number,
	options?: OrderConfirmationOptions,
	paths: CheckoutPaths = defaultCheckoutPaths,
): void {
	if (typeof window === "undefined") return;
	const qs = new URLSearchParams({ order_id: orderId });
	if (displayId) qs.set("display_id", String(displayId));
	if (options?.payment === "bank_transfer") {
		qs.set("payment", "bank_transfer");
	}
	window.location.replace(`${paths.confirmation}?${qs.toString()}`);
}

/** Providery widoczne w checkoutcie (reszta ukryta do czasu włączenia). */
export const CHECKOUT_VISIBLE_PROVIDER_IDS = [
	PRZELEWY24_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
] as const;

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

export function pickLowestPaidShippingOptionPrice(
	options: Array<{ price: number; isPickup: boolean }>,
): number | null {
	const paid = options.filter((o) => !o.isPickup);
	if (!paid.length) return null;
	return Math.min(...paid.map((o) => o.price));
}

/** @deprecated Użyj `pickLowestPaidShippingOptionPrice`. */
export function pickLowestShippingOptionPrice(
	options: Array<{ price: number; isPickup?: boolean }>,
): number | null {
	const normalized = options.map((o) => ({
		price: o.price,
		isPickup: o.isPickup ?? false,
	}));
	return pickLowestPaidShippingOptionPrice(normalized);
}

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
		const list = (raw ?? []) as unknown[];
		if (!list.length || !cartOptionsHavePickup(list)) {
			await ensureShippingBootstrap();
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

type PaymentReadiness = {
	regionId: string;
	providerId: string;
	providerIds: string[];
};

let paymentReadinessPromise: Promise<PaymentReadiness> | null = null;

export function prefetchPaymentReadiness(
	getRegionId: () => Promise<string>,
	supportEmail = "kontakt@example.com",
): Promise<PaymentReadiness> {
	if (paymentReadinessPromise) return paymentReadinessPromise;
	paymentReadinessPromise = (async () => {
		const regionId = await getRegionId();
		let providers = await listPaymentProviders(regionId);
		let providerId = pickPreferredProvider(providers);
		if (!providerId) {
			await ensurePaymentBootstrap();
			providers = await listPaymentProviders(regionId);
			providerId = pickPreferredProvider(providers);
		}
		if (!providerId) {
			throw new Error(
				`Brak skonfigurowanych metod płatności. Napisz na ${supportEmail}.`,
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

export async function ensureShippingBootstrap(): Promise<{ ok: boolean }> {
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

export async function listPaymentProviders(regionId: string) {
	const { payment_providers } = (await medusa.store.payment.listPaymentProviders(
		{ region_id: regionId },
	)) as { payment_providers: Array<{ id: string; is_enabled?: boolean }> };
	return payment_providers.filter((p) => p.is_enabled !== false);
}

export async function ensurePaymentBootstrap(): Promise<{ ok: boolean }> {
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
		/* koszyk może być już zamknięty */
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
		itemTotalFromCart || items.reduce((sum, item) => sum + item.total, 0);
	const shippingTotal = cartAmountToMinor(cart?.shipping_total);
	const total = cartAmountToMinor(cart?.total) || itemTotal + shippingTotal;

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

export function notifyOrderPlaced(orderId: string): void {
	if (!orderId) return;
	void notifyOrderPlacedAwait(orderId).catch(() => undefined);
}

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

	return false;
}

export async function selectShippingOption(cartId: string, optionId: string) {
	const response = await medusa.store.cart.addShippingMethod(cartId, {
		option_id: optionId,
	});
	return response.cart;
}

export async function prepareCheckout(
	cartId: string,
	optionId: string,
	providerId: string,
	orderNotes?: string,
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
		body: JSON.stringify({
			cart_id: cartId,
			option_id: optionId,
			provider_id: providerId,
			...(orderNotes ? { order_notes: orderNotes } : {}),
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

export async function initPaymentSession(
	cartId: string,
	providerId: string,
	freshCart?: HttpTypes.StoreCart,
) {
	const cart = freshCart ?? (await medusa.store.cart.retrieve(cartId)).cart;
	const response = await medusa.store.payment.initiatePaymentSession(cart, {
		provider_id: providerId,
	});
	return response;
}

type ReusableSessionLike = {
	provider_id?: string;
	status?: string;
	data?: { redirect_url?: string };
};

type CartWithSessions = {
	payment_collection?: {
		payment_sessions?: ReusableSessionLike[] | null;
	} | null;
};

/**
 * Aktywna sesja danej bramki z gotowym `redirect_url`, którą można reużyć.
 * „pending" = transakcja zarejestrowana w bramce, klient jeszcze nie zapłacił.
 * Reużycie chroni przed duplikatami transakcji przy reloadzie / wielokrotnym
 * kliknięciu „Zamawiam i płacę" (potwierdzony incydent produkcyjny).
 */
export function findReusableRedirectUrl(
	cart: CartWithSessions,
	providerId: string,
): string | null {
	const sessions = cart.payment_collection?.payment_sessions ?? [];
	for (const session of sessions) {
		if (session.provider_id !== providerId) continue;
		if (session.status && session.status !== "pending") continue;
		const url = session.data?.redirect_url;
		if (typeof url === "string" && url.trim()) return url;
	}
	return null;
}

/** Pola sesji płatności potrzebne do wykrycia reużywalnej sesji bramki. */
export const PAYMENT_SESSION_FIELDS =
	"id,email,payment_collection.id,payment_collection.payment_sessions.provider_id,payment_collection.payment_sessions.status,payment_collection.payment_sessions.data";

export async function initPrzelewy24Redirect(
	cartId: string,
	freshCart?: HttpTypes.StoreCart,
): Promise<string> {
	const cart =
		freshCart ??
		(await medusa.store.cart.retrieve(cartId, { fields: PAYMENT_SESSION_FIELDS }))
			.cart;

	// Idempotencja: reużyj istniejącej, nieopłaconej sesji P24 (ten sam URL
	// bramki) zamiast rejestrować nową transakcję — bez tego każdy reload
	// /start tworzył duplikat w panelu Przelewy24.
	const reusable = findReusableRedirectUrl(cart, PRZELEWY24_PROVIDER_ID);
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

export { type CompleteCartResponse };

export function isCartAlreadyCompletedError(e: unknown): boolean {
	const msg =
		(e as { message?: string } | null)?.message ??
		(typeof e === "string" ? e : "") ??
		"";
	return /already\s+completed/i.test(msg);
}

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
	const looksGeneric =
		!message || /^an unknown error occurred\.?$/i.test(message.trim());
	if (looksGeneric && (status >= 500 || status === 0) && !(type || code)) {
		return "Chwilowy problem z serwerem. Poczekaj 10 sekund i spróbuj jeszcze raz — Twoje dane zostały zachowane.";
	}
	if (message) return message;
	if (type || code) return `${type || "error"}${code ? ` (${code})` : ""}`;
	return fallback;
}

const COMPLETE_CART_BACKOFF_MS = [500, 1000, 2000, 4000];

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
				status === 409 || /idempotency/i.test(msg) || /conflict/i.test(msg);
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
