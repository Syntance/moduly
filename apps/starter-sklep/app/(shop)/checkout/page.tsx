import type { Metadata } from "next";
import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";

export const metadata: Metadata = {
	title: "Zamówienie",
	robots: { index: false },
};

export default function CheckoutPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-10">
			<nav className="mb-6 text-sm text-muted-foreground">
				<a href="/" className="hover:text-foreground">
					Strona główna
				</a>
				<span className="mx-2">/</span>
				<a href="/koszyk" className="hover:text-foreground">
					Koszyk
				</a>
				<span className="mx-2">/</span>
				<span className="text-foreground">Zamówienie</span>
			</nav>
			<h1 className="mb-8 font-serif text-3xl text-foreground">Zamówienie</h1>
			<CheckoutPageClient />
		</div>
	);
}
