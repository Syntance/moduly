"use client";

import { Plus, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@moduly/ui";
import { PromotionForm } from "./promotion-form";
import { formatPromoDiscountLabel } from "./promo-form-utils";
import type { AdminPromoCode, ProductOption } from "./types";

type Props = {
	productId: string;
	productTitle: string;
	promos: AdminPromoCode[];
	products: ProductOption[];
};

export function ProductPromotionsSection({
	productId,
	productTitle,
	promos,
	products,
}: Props) {
	const router = useRouter();
	const [creating, setCreating] = useState(false);

	return (
		<section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Ticket className="size-4" aria-hidden />
					</span>
					<div>
						<h2 className="font-serif text-lg text-foreground">Kody promocyjne</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Kody przypisane do „{productTitle}” lub działające na całe zamówienie.
						</p>
					</div>
				</div>
				{!creating ? (
					<Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
						<Plus className="size-4" aria-hidden />
						Dodaj kod
					</Button>
				) : null}
			</div>

			{creating ? (
				<PromotionForm
					products={products}
					defaultProductIds={[productId]}
					onCancel={() => setCreating(false)}
					onSaved={() => {
						setCreating(false);
						router.refresh();
					}}
				/>
			) : null}

			{promos.length === 0 && !creating ? (
				<p className="text-sm text-muted-foreground">
					Brak kodów przypisanych do tego produktu.
				</p>
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border">
					{promos.map((promo) => (
						<li key={promo.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<span className="font-mono text-sm font-semibold">{promo.code}</span>
								<p className="text-xs text-muted-foreground">
									{formatPromoDiscountLabel(promo)}
									{promo.productIds.length === 0 ? " · całe zamówienie" : " · ten produkt"}
									{promo.freeShippingEnabled ? " · darmowa dostawa" : ""}
								</p>
							</div>
							<span
								className={
									promo.status === "active"
										? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
										: "text-xs text-muted-foreground"
								}
							>
								{promo.status === "active" ? "aktywny" : "szkic"}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
