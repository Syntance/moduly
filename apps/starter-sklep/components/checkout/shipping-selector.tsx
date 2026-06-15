"use client";

import { useEffect, useState } from "react";
import { formatPrice, prefetchShippingOptions } from "@moduly/commerce";
import { useCart } from "@/components/providers/cart-provider";

type ShippingOption = {
	id: string;
	name: string;
	price: number;
};

type Props = {
	selectedOptionId: string;
	onSelect: (optionId: string) => void;
};

export function ShippingSelector({ selectedOptionId, onSelect }: Props) {
	const { cartId } = useCart();
	const [options, setOptions] = useState<ShippingOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!cartId) return;
		let cancelled = false;
		setLoading(true);
		setError(null);

		void prefetchShippingOptions(cartId)
			.then((raw) => {
				if (cancelled) return;
				const mapped = (raw ?? []).map((row) => {
					const r = row as unknown as Record<string, unknown>;
					const amount = r.amount as number | undefined;
					return {
						id: String(r.id ?? ""),
						name: String(r.name ?? "Dostawa"),
						price: amount ?? 0,
					};
				});
				setOptions(mapped);
				if (mapped.length > 0 && !selectedOptionId) {
					onSelect(mapped[0]?.id ?? "");
				}
			})
			.catch(() => {
				if (!cancelled) setError("Nie udało się pobrać opcji dostawy.");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [cartId, onSelect, selectedOptionId]);

	if (loading) {
		return <p className="text-sm text-muted-foreground">Ładowanie opcji dostawy…</p>;
	}

	if (error) {
		return <p role="alert" className="text-sm text-destructive">{error}</p>;
	}

	if (options.length === 0) {
		return <p className="text-sm text-muted-foreground">Brak dostępnych opcji dostawy.</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			{options.map((option) => (
				<label
					key={option.id}
					className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 has-[:checked]:border-primary"
				>
					<span className="flex items-center gap-3">
						<input
							type="radio"
							name="shipping"
							value={option.id}
							checked={selectedOptionId === option.id}
							onChange={() => { onSelect(option.id); }}
							className="size-4"
						/>
						<span className="text-sm font-medium">{option.name}</span>
					</span>
					<span className="text-sm tabular-nums">{formatPrice(option.price)}</span>
				</label>
			))}
		</div>
	);
}
