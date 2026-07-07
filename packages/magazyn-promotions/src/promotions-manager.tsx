"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { ConfirmDialog } from "@moduly/ui";
import { cn } from "@moduly/ui";
import { deletePromoCodeAction } from "./actions";
import { PromotionForm } from "./promotion-form";
import { formatPromoDiscountLabel, formatPromoScopeLabel } from "./promo-form-utils";
import type { AdminPromoCode, ProductOption } from "./types";

type Props = {
	promos: AdminPromoCode[];
	products: ProductOption[];
};

export function PromotionsManager({ promos, products }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState<AdminPromoCode | null>(null);
	const [creating, setCreating] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<AdminPromoCode | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleting, startDelete] = useTransition();

	const productTitleById = useMemo(
		() => new Map(products.map((product) => [product.id, product.title])),
		[products],
	);

	function handleSaved() {
		setEditing(null);
		setCreating(false);
		router.refresh();
	}

	function confirmDelete() {
		if (!deleteTarget) return;
		setError(null);
		startDelete(async () => {
			const result = await deletePromoCodeAction(deleteTarget.id);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setDeleteTarget(null);
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					{promos.length} {promos.length === 1 ? "kod" : promos.length < 5 ? "kody" : "kodów"}
				</p>
				<Button type="button" onClick={() => { setCreating(true); setEditing(null); }}>
					<Plus className="size-4" aria-hidden />
					Dodaj kod
				</Button>
			</div>

			{creating ? (
				<PromotionForm
					products={products}
					onCancel={() => setCreating(false)}
					onSaved={handleSaved}
				/>
			) : null}

			{editing ? (
				<PromotionForm
					promo={editing}
					products={products}
					onCancel={() => setEditing(null)}
					onSaved={handleSaved}
				/>
			) : null}

			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			{promos.length === 0 && !creating ? (
				<div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
					<p className="text-sm text-muted-foreground">
						Brak kodów promocyjnych. Dodaj pierwszy kod, aby klienci mogli go użyć w checkout.
					</p>
				</div>
			) : (
				<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
					{promos.map((promo) => (
						<li
							key={promo.id}
							className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-mono text-sm font-semibold tracking-wide text-foreground">
										{promo.code}
									</span>
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
											promo.status === "active"
												? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
												: "bg-muted text-muted-foreground",
										)}
									>
										{promo.status === "active" ? "aktywny" : "szkic"}
									</span>
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									{formatPromoDiscountLabel(promo)}
									{" · "}
									{formatPromoScopeLabel(promo, productTitleById)}
								</p>
									{promo.freeShippingEnabled ? (
									<p className="mt-1 text-xs text-muted-foreground">
										Darmowa dostawa
										{promo.freeShippingMinAmount
											? ` od ${promo.freeShippingMinAmount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}`
											: " bez progu"}
									</p>
								) : null}
							</div>

							<div className="flex shrink-0 gap-2">
								<button
									type="button"
									onClick={() => { setEditing(promo); setCreating(false); }}
									aria-label={`Edytuj ${promo.code}`}
									className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<Pencil className="size-4" aria-hidden />
								</button>
								<button
									type="button"
									onClick={() => setDeleteTarget(promo)}
									aria-label={`Usuń ${promo.code}`}
									className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<Trash2 className="size-4" aria-hidden />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			<ConfirmDialog
				open={deleteTarget !== null}
				title="Usunąć kod promocyjny?"
				description={
					deleteTarget
						? `Kod „${deleteTarget.code}” przestanie działać w koszyku i checkout. Tej operacji nie można cofnąć.`
						: ""
				}
				confirmLabel="Usuń kod"
				cancelLabel="Anuluj"
				variant="destructive"
				busy={deleting}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteTarget(null)}
			/>
		</div>
	);
}
