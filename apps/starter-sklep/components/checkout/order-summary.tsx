"use client";

import { formatPrice } from "@moduly/commerce";
import { useCart } from "@/components/providers/cart-provider";

type Props = {
	selectedShippingOptionId: string;
};

export function OrderSummary({ selectedShippingOptionId: _selectedShippingOptionId }: Props) {
	const { items, total } = useCart();

	if (items.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">Koszyk jest pusty.</p>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<h2 className="font-serif text-lg text-foreground">Podsumowanie</h2>
			<ul className="mt-4 flex flex-col gap-3">
				{items.map((item) => (
					<li key={item.id} className="flex justify-between gap-4 text-sm">
						<span>
							{item.title} × {item.quantity}
						</span>
						<span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
					</li>
				))}
			</ul>
			<div className="mt-4 flex justify-between border-t border-border pt-4 font-medium">
				<span>Razem</span>
				<span className="tabular-nums">{formatPrice(total)}</span>
			</div>
		</div>
	);
}
