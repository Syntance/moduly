"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState, useTransition } from "react";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { Button, Input } from "@moduly/ui";
import type { ProductFaqItem, ProductSeoMeta } from "@moduly/types";
import { saveProductAction, uploadImagesAction } from "./actions";
import { ProductFormTabs } from "./product-form-tabs";
import { ProductImagesEditor } from "./product-images-editor";
import { ProductSeoPanel } from "./product-seo-panel";
import type { AdminProductDetail, CategoryOption } from "./store";

type Props = {
	product?: AdminProductDetail;
	categories: CategoryOption[];
};

const inputClass =
	"w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProductForm({ product, categories }: Props) {
	const router = useRouter();
	const titleId = useId();
	const config = getModulyConfig();

	const [title, setTitle] = useState(product?.title ?? "");
	const [status, setStatus] = useState<"draft" | "published">(product?.status ?? "draft");
	const [categoryIds, setCategoryIds] = useState<string[]>(() => product?.categoryIds ?? []);
	const [description, setDescription] = useState(product?.description ?? "");
	const [priceMajor, setPriceMajor] = useState<string>(
		product?.price != null ? String(product.price / 100) : "",
	);
	const [images, setImages] = useState<string[]>(product?.images ?? []);
	const [seo, setSeo] = useState<ProductSeoMeta>(() => product?.seo ?? {});
	const [productFaq, setProductFaq] = useState<ProductFaqItem[]>(() => product?.productFaq ?? []);
	const [pdpCalloutEnabled, setPdpCalloutEnabled] = useState(
		() => product?.pdpCalloutEnabled ?? false,
	);
	const [pdpCallout, setPdpCallout] = useState(() => product?.pdpCallout ?? "");
	const [minOrderQuantity, setMinOrderQuantity] = useState(
		() => product?.minOrderQuantity ?? 1,
	);

	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [saving, startSave] = useTransition();

	const uploadFiles = useCallback(async (files: File[]) => {
		if (files.length === 0) return;
		setUploading(true);
		setError(null);
		try {
			const formData = new FormData();
			for (const file of files) formData.append("files", file);
			const result = await uploadImagesAction(formData);
			if (result.error) {
				setError(result.error);
				return;
			}
			setImages((prev) => [...prev, ...result.urls]);
		} catch {
			setError("Upload nie powiódł się. Spróbuj ponownie.");
		} finally {
			setUploading(false);
		}
	}, []);

	function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setSaved(false);
		const priceNumber = priceMajor.trim() === "" ? null : Math.round(Number(priceMajor) * 100);

		startSave(async () => {
			const result = await saveProductAction({
				id: product?.id,
				handle: product?.handle,
				title: title.trim(),
				status,
				categoryIds,
				description,
				price: priceNumber,
				images,
				seo,
				productFaq: productFaq.filter((f) => f.question.trim() && f.answer.trim()),
				pdpCalloutEnabled,
				pdpCallout,
				minOrderQuantity,
			});
			if (result && !result.ok) {
				setError(result.error);
				return;
			}
			if (product?.id) {
				setSaved(true);
				router.refresh();
			}
		});
	}

	const basicPanel = (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-1.5">
				<label htmlFor={titleId} className="text-sm font-medium">
					Nazwa
				</label>
				<Input
					id={titleId}
					value={title}
					onChange={(e) => { setTitle(e.target.value); }}
					placeholder="np. Lampa stołowa"
					required
					className="h-10"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<span className="text-sm font-medium">Opis</span>
				<textarea
					value={description}
					onChange={(e) => { setDescription(e.target.value); }}
					rows={6}
					className={inputClass}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="product-status" className="text-sm font-medium">
					Status
				</label>
				<select
					id="product-status"
					value={status}
					onChange={(e) => { setStatus(e.target.value as "draft" | "published"); }}
					className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<option value="draft">Szkic</option>
					<option value="published">Opublikowany</option>
				</select>
			</div>

			<fieldset className="flex flex-col gap-2">
				<legend className="text-sm font-medium">Kategorie</legend>
				<p className="text-xs text-muted-foreground">
					Produkt może być widoczny w wielu kategoriach sklepu.
				</p>
				<div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-input p-3">
					{categories.length === 0 ? (
						<p className="text-sm text-muted-foreground">Brak kategorii w sklepie.</p>
					) : (
						categories.map((c) => {
							const checked = categoryIds.includes(c.id);
							return (
								<label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={checked}
										onChange={() => {
											setCategoryIds((prev) =>
												checked ? prev.filter((id) => id !== c.id) : [...prev, c.id],
											);
										}}
										className="size-4 rounded border-input accent-primary"
									/>
									<span>{c.name}</span>
								</label>
							);
						})
					)}
				</div>
			</fieldset>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="product-price" className="text-sm font-medium">
					Cena ({config.commerce.currency.toUpperCase()})
				</label>
				<Input
					id="product-price"
					type="number"
					min={0}
					step="0.01"
					value={priceMajor}
					onChange={(e) => { setPriceMajor(e.target.value); }}
					placeholder="0.00"
					className="h-10"
					required
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="product-min-qty" className="text-sm font-medium">
					Minimalna ilość (szt.)
				</label>
				<Input
					id="product-min-qty"
					type="number"
					min={1}
					max={99}
					step={1}
					value={minOrderQuantity}
					onChange={(e) => {
						const raw = Number.parseInt(e.target.value, 10);
						if (!Number.isFinite(raw)) {
							setMinOrderQuantity(1);
							return;
						}
						setMinOrderQuantity(Math.min(99, Math.max(1, raw)));
					}}
					className="h-10"
				/>
			</div>

			<div className="flex flex-col gap-3 rounded-lg border border-input px-3 py-3 text-sm">
				<label className="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						checked={pdpCalloutEnabled}
						onChange={(e) => { setPdpCalloutEnabled(e.target.checked); }}
						className="mt-0.5 size-4 rounded border-input accent-primary"
					/>
					<span>
						<span className="font-medium">Callout na PDP</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">
							Informacja pod nagłówkiem produktu na stronie sklepu.
						</span>
					</span>
				</label>
				{pdpCalloutEnabled ? (
					<div className="flex flex-col gap-1.5 pl-7">
						<label htmlFor="pdp-callout" className="text-sm font-medium">
							Treść calloutu
						</label>
						<textarea
							id="pdp-callout"
							value={pdpCallout}
							onChange={(e) => { setPdpCallout(e.target.value); }}
							rows={3}
							maxLength={500}
							className={inputClass}
							required
						/>
					</div>
				) : null}
			</div>
		</div>
	);

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-6">
			<ProductFormTabs
				basicPanel={basicPanel}
				imagesPanel={
					<ProductImagesEditor
						images={images}
						onChange={setImages}
						uploading={uploading}
						onUploadFiles={(files) => {
							void uploadFiles(files);
						}}
					/>
				}
				seoPanel={
					<ProductSeoPanel
						seo={seo}
						productFaq={productFaq}
						onSeoChange={setSeo}
						onFaqChange={setProductFaq}
					/>
				}
			/>

			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
			{saved ? (
				<p role="status" className="text-sm text-emerald-600">
					Zapisano.
				</p>
			) : null}

			<div className="flex flex-wrap gap-2">
				<Button type="submit" size="lg" disabled={saving || uploading} className="h-10 gap-1.5">
					{saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
					{saving ? "Zapisywanie…" : "Zapisz produkt"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={saving}
					onClick={() => { router.push(`${config.basePath}/panel/produkty`); }}
				>
					Anuluj
				</Button>
			</div>
		</form>
	);
}
