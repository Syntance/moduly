"use client";

import Link from "next/link";
import { formatPrice } from "@moduly/commerce";
import { useCart } from "@/components/providers/cart-provider";

export function CartPageClient() {
	const { items, total, isInitialized } = useCart();

	if (!isInitialized) {
		return <p className="text-muted-foreground">Ładowanie koszyka…</p>;
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center gap-4 py-16 text-center">
				<p className="font-serif text-xl text-foreground">Twój koszyk jest pusty</p>
				<p className="text-sm text-muted-foreground">Dodaj produkty ze sklepu, aby kontynuować.</p>
				<Link
					href="/sklep"
					className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Przejdź do sklepu
				</Link>
			</div>
		);
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
			<ul className="flex flex-col gap-4">
				{items.map((item) => (
					<li
						key={item.id}
						className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
					>
						<div>
							<p className="font-medium">{item.title}</p>
							<p className="text-sm text-muted-foreground">Ilość: {item.quantity}</p>
						</div>
						<p className="tabular-nums font-medium">
							{formatPrice(item.unitPrice * item.quantity)}
						</p>
					</li>
				))}
			</ul>

			<aside className="rounded-xl border border-border bg-card p-5">
				<div className="flex justify-between font-medium">
					<span>Suma</span>
					<span className="tabular-nums">{formatPrice(total)}</span>
				</div>
				<Link
					href="/checkout"
					className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Przejdź do zamówienia
				</Link>
			</aside>
		</div>
	);
}
