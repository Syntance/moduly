import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
	title: "Koszyk",
	robots: { index: false },
};

export default function CartPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-10">
			<h1 className="mb-8 font-serif text-3xl text-foreground">Koszyk</h1>
			<CartPageClient />
		</div>
	);
}
