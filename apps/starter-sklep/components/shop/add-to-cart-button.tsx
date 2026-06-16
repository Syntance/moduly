"use client";

import { useState } from "react";
import { useAnalytics } from "@moduly/analytics";
import { Button } from "@moduly/ui";
import { useCart } from "@/components/providers/cart-provider";

type Props = {
	variantId: string;
	title: string;
	priceMinor: number;
	currency?: string;
};

export function AddToCartButton({
	variantId,
	title,
	priceMinor,
	currency = "PLN",
}: Props) {
	const analytics = useAnalytics();
	const { addItem, isInitialized } = useCart();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="mt-8 space-y-2">
			<Button
				type="button"
				disabled={!isInitialized || pending || priceMinor <= 0}
				onClick={async () => {
					setPending(true);
					setError(null);
					try {
						await addItem(variantId, 1);
						analytics.addToCart({
							currency,
							value: priceMinor,
							items: [
								{
									item_id: variantId,
									item_name: title,
									price: priceMinor,
									quantity: 1,
								},
							],
						});
					} catch {
						setError("Nie udało się dodać do koszyka. Spróbuj ponownie.");
					} finally {
						setPending(false);
					}
				}}
			>
				{pending ? "Dodawanie…" : "Dodaj do koszyka"}
			</Button>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
