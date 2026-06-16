"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { addLineItem, bootstrapCartSession, getCart } from "@moduly/commerce";
import { formatPrice } from "@moduly/commerce";

type CartItem = {
	id: string;
	title: string;
	quantity: number;
	unitPrice: number;
	thumbnail?: string;
};

type CartContextValue = {
	cartId: string | null;
	items: CartItem[];
	total: number;
	isInitialized: boolean;
	refreshCart: () => Promise<void>;
	addItem: (variantId: string, quantity?: number) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function mapLineItems(cart: Record<string, unknown>): CartItem[] {
	const items = cart.items as Array<Record<string, unknown>> | undefined;
	if (!items?.length) return [];

	return items.map((item) => {
		const unit = item.unit_price as number | undefined;
		const product = item.product as { title?: string; thumbnail?: string } | undefined;
		const variant = item.variant as { title?: string } | undefined;
		return {
			id: String(item.id ?? ""),
			title: product?.title ?? variant?.title ?? "Produkt",
			quantity: Number(item.quantity ?? 1),
			unitPrice: unit ?? 0,
			thumbnail: product?.thumbnail,
		};
	});
}

function cartTotal(cart: Record<string, unknown>): number {
	const total = cart.total as number | undefined;
	if (typeof total === "number") return total;
	return mapLineItems(cart).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [cartId, setCartId] = useState<string | null>(null);
	const [items, setItems] = useState<CartItem[]>([]);
	const [total, setTotal] = useState(0);
	const [isInitialized, setIsInitialized] = useState(false);

	const applyCart = useCallback((cart: Record<string, unknown> | null) => {
		if (!cart) {
			setCartId(null);
			setItems([]);
			setTotal(0);
			return;
		}
		setCartId(String(cart.id ?? ""));
		setItems(mapLineItems(cart));
		setTotal(cartTotal(cart));
	}, []);

	const refreshCart = useCallback(async () => {
		if (cartId) {
			try {
				const cart = await getCart(cartId);
				applyCart(cart);
				return;
			} catch {
				/* fallback — nowy bootstrap */
			}
		}
		const cart = await bootstrapCartSession();
		applyCart(cart);
	}, [applyCart, cartId]);

	const addItem = useCallback(
		async (variantId: string, quantity = 1) => {
			let activeCartId = cartId;
			if (!activeCartId) {
				const cart = await bootstrapCartSession();
				if (!cart?.id) {
					throw new Error("Brak koszyka.");
				}
				activeCartId = String(cart.id);
				applyCart(cart);
			}
			const updated = await addLineItem(activeCartId, variantId, quantity);
			if (updated && typeof updated === "object") {
				applyCart(updated as Record<string, unknown>);
			} else {
				await refreshCart();
			}
		},
		[applyCart, cartId, refreshCart],
	);

	useEffect(() => {
		let cancelled = false;
		void bootstrapCartSession()
			.then((cart) => {
				if (!cancelled) applyCart(cart);
			})
			.finally(() => {
				if (!cancelled) setIsInitialized(true);
			});
		return () => {
			cancelled = true;
		};
	}, [applyCart]);

	const value = useMemo(
		() => ({ cartId, items, total, isInitialized, refreshCart, addItem }),
		[cartId, items, total, isInitialized, refreshCart, addItem],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
	const ctx = useContext(CartContext);
	if (!ctx) {
		throw new Error("useCart musi być użyty wewnątrz CartProvider");
	}
	return ctx;
}

export { formatPrice };
