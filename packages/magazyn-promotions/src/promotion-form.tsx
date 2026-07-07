"use client";

import { Loader2, Save, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { CheckboxInput } from "@moduly/ui";
import { savePromoCodeAction, type PromoPayload } from "./actions";
import type { AdminPromoCode, ProductOption, PromoCodeInput } from "./types";
import { promoCodeToFormValues } from "./promo-form-utils";

/** Parsuje wartość z <input type="number"> akceptując zarówno "9.90" jak i "9,90". */
function parseDecimalInput(raw: string): number {
	const normalized = raw.trim().replace(",", ".");
	const n = Number(normalized);
	return Number.isFinite(n) ? n : NaN;
}

type Props = {
	promo?: AdminPromoCode;
	products: ProductOption[];
	/** Wstępnie zaznaczone produkty (np. z edycji produktu). */
	defaultProductIds?: string[];
	onCancel: () => void;
	onSaved: () => void;
};

const EMPTY: PromoCodeInput = {
	code: "",
	status: "active",
	discountType: "percentage",
	discountValueMajor: 10,
	productIds: [],
	freeShippingEnabled: false,
	freeShippingMinAmountMajor: null,
};

export function PromotionForm({
	promo,
	products,
	defaultProductIds = [],
	onCancel,
	onSaved,
}: Props) {
	const codeId = useId();
	const [form, setForm] = useState<PromoCodeInput>(() =>
		promo ? promoCodeToFormValues(promo) : { ...EMPTY, productIds: defaultProductIds },
	);
	const [error, setError] = useState<string | null>(null);
	const [saving, startSave] = useTransition();

	useEffect(() => {
		if (promo) {
			setForm(promoCodeToFormValues(promo));
		}
	}, [promo]);

	function toggleProduct(productId: string) {
		setForm((prev) => {
			const selected = prev.productIds.includes(productId);
			return {
				...prev,
				productIds: selected
					? prev.productIds.filter((id) => id !== productId)
					: [...prev.productIds, productId],
			};
		});
	}

	const allProductIds = useMemo(() => products.map((product) => product.id), [products]);
	const allProductsSelected =
		allProductIds.length > 0 && allProductIds.every((id) => form.productIds.includes(id));
	const someProductsSelected =
		form.productIds.length > 0 && !allProductsSelected;

	function toggleAllProducts(checked: boolean) {
		setForm((prev) => ({
			...prev,
			productIds: checked ? allProductIds : [],
		}));
	}

	function handleSubmit() {
		setError(null);
		const payload: PromoPayload = {
			id: promo?.id,
			...form,
		};

		startSave(async () => {
			const result = await savePromoCodeAction(payload);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			onSaved();
		});
	}

	const showDiscountValue = form.discountType !== "none";

	return (
		<div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="font-serif text-lg text-foreground">
						{promo ? "Edytuj kod promocyjny" : "Nowy kod promocyjny"}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Kod wpisuje klient w koszyku lub checkout. Puste produkty = rabat na całe zamówienie.
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					aria-label="Zamknij formularz"
					className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<X className="size-4" aria-hidden />
				</button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5 sm:col-span-2">
					<label htmlFor={codeId} className="text-sm font-medium">
						Kod
					</label>
					<Input
						id={codeId}
						value={form.code}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
						}
						placeholder="np. LATO2026"
						className="h-10 uppercase"
						required
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor={`${codeId}-status`} className="text-sm font-medium">
						Status
					</label>
					<select
						id={`${codeId}-status`}
						value={form.status}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								status: e.target.value as PromoCodeInput["status"],
							}))
						}
						className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<option value="active">Aktywny</option>
						<option value="draft">Szkic</option>
					</select>
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor={`${codeId}-discount-type`} className="text-sm font-medium">
						Rabat
					</label>
					<select
						id={`${codeId}-discount-type`}
						value={form.discountType}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								discountType: e.target.value as PromoCodeInput["discountType"],
							}))
						}
						className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<option value="percentage">Procent od ceny</option>
						<option value="fixed">Kwota stała (PLN)</option>
						<option value="none">Brak rabatu</option>
					</select>
				</div>

				{showDiscountValue ? (
					<div className="flex flex-col gap-1.5">
						<label htmlFor={`${codeId}-discount-value`} className="text-sm font-medium">
							{form.discountType === "percentage" ? "Procent rabatu" : "Kwota rabatu (PLN)"}
						</label>
						<Input
							id={`${codeId}-discount-value`}
							type="number"
							min={form.discountType === "percentage" ? 1 : 0.01}
							max={form.discountType === "percentage" ? 100 : undefined}
							step={form.discountType === "percentage" ? 1 : 0.01}
							value={form.discountValueMajor || ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									discountValueMajor: parseDecimalInput(e.target.value),
								}))
							}
							className="h-10"
						/>
					</div>
				) : null}
			</div>

			<fieldset className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<legend className="text-sm font-medium">Produkty objęte kodem</legend>
					{products.length > 0 ? (
						<span className="text-xs tabular-nums text-muted-foreground">
							{form.productIds.length}/{products.length}
						</span>
					) : null}
				</div>
				<p className="text-xs text-muted-foreground">
					Bez zaznaczenia — kod działa na całe zamówienie. Zaznacz produkty, by ograniczyć rabat.
				</p>
				<div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-input p-3">
					{products.length === 0 ? (
						<p className="text-sm text-muted-foreground">Brak produktów w sklepie.</p>
					) : (
						<>
							<label className="flex cursor-pointer items-center gap-2 border-b border-border pb-2 text-sm font-medium">
								<input
									type="checkbox"
									checked={allProductsSelected}
									onChange={(e) => toggleAllProducts(e.target.checked)}
									className="size-4 rounded border-input accent-primary"
								/>
								<span>
									Zaznacz wszystkie produkty
									{someProductsSelected ? (
										<span className="ml-1 font-normal text-muted-foreground">
											(częściowo)
										</span>
									) : null}
								</span>
							</label>
							{products.map((product) => {
							const checked = form.productIds.includes(product.id);
							return (
								<label
									key={product.id}
									className="flex cursor-pointer items-center gap-2 text-sm"
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => toggleProduct(product.id)}
										className="size-4 rounded border-input accent-primary"
									/>
									<span className="truncate">{product.title}</span>
								</label>
							);
						})}
						</>
					)}
				</div>
			</fieldset>

			<div className="flex flex-col gap-3 rounded-lg border border-input px-3 py-3">
				<label className="flex cursor-pointer items-start gap-3 text-sm">
					<CheckboxInput
						checked={form.freeShippingEnabled}
						onChange={(checked) =>
							setForm((prev) => ({
								...prev,
								freeShippingEnabled: checked,
								freeShippingMinAmountMajor: checked ? prev.freeShippingMinAmountMajor : null,
							}))
						}
						className="mt-0.5"
					/>
					<span>
						<span className="font-medium">Darmowa dostawa</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">
							Przy aktywnym kodzie klient może otrzymać gratis dostawę po spełnieniu progu koszyka.
						</span>
					</span>
				</label>

				{form.freeShippingEnabled ? (
					<div className="flex flex-col gap-1.5 pl-7">
						<label htmlFor={`${codeId}-fs-min`} className="text-sm font-medium">
							Minimalna wartość koszyka (PLN)
						</label>
						<Input
							id={`${codeId}-fs-min`}
							type="number"
							min={0}
							step={1}
							placeholder="Bez progu — zawsze gratis dostawa"
							value={form.freeShippingMinAmountMajor ?? ""}
							onChange={(e) => {
								const raw = e.target.value.trim();
								const parsed = parseDecimalInput(raw);
								setForm((prev) => ({
									...prev,
									freeShippingMinAmountMajor: raw === "" || !Number.isFinite(parsed) ? null : parsed,
								}));
							}}
							className="h-10"
						/>
					</div>
				) : null}
			</div>

			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Anuluj
				</Button>
				<Button type="button" onClick={handleSubmit} disabled={saving}>
					{saving ? (
						<Loader2 className="size-4 animate-spin" aria-hidden />
					) : (
						<Save className="size-4" aria-hidden />
					)}
					Zapisz kod
				</Button>
			</div>
		</div>
	);
}
