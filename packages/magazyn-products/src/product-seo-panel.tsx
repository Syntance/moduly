"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@moduly/ui";
import type { ProductFaqItem, ProductSeoMeta } from "@moduly/types";
import { newCmsId } from "@moduly/magazyn-content/cms-id";
import { OgImageField } from "@moduly/magazyn-content/seo/og-image-field";

const inputClass =
	"w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = {
	seo: ProductSeoMeta;
	productFaq: ProductFaqItem[];
	onSeoChange: (seo: ProductSeoMeta) => void;
	onFaqChange: (faq: ProductFaqItem[]) => void;
};

export function ProductSeoPanel({ seo, productFaq, onSeoChange, onFaqChange }: Props) {
	function updateSeo(patch: Partial<ProductSeoMeta>) {
		onSeoChange({ ...seo, ...patch });
	}

	function addFaq() {
		onFaqChange([
			...productFaq,
			{ id: newCmsId("pfaq"), question: "", answer: "", order: productFaq.length },
		]);
	}

	function updateFaq(index: number, patch: Partial<ProductFaqItem>) {
		onFaqChange(productFaq.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}

	function removeFaq(index: number) {
		onFaqChange(productFaq.filter((_, i) => i !== index));
	}

	return (
		<div className="flex flex-col gap-6">
			<fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
				<legend className="px-1 text-sm font-medium">SEO produktu</legend>
				<Input
					value={seo.metaTitle ?? ""}
					onChange={(e) => { updateSeo({ metaTitle: e.target.value }); }}
					placeholder="Meta Title"
					className="h-10"
				/>
				<textarea
					value={seo.metaDescription ?? ""}
					onChange={(e) => { updateSeo({ metaDescription: e.target.value }); }}
					rows={3}
					className={inputClass}
					placeholder="Meta Description"
				/>
				<Input
					value={seo.ogTitle ?? ""}
					onChange={(e) => { updateSeo({ ogTitle: e.target.value }); }}
					placeholder="OG Title"
					className="h-10"
				/>
				<OgImageField
					label="OG Image"
					value={seo.ogImageUrl ?? ""}
					onChange={(url) => { updateSeo({ ogImageUrl: url }); }}
				/>
				<Input
					value={seo.canonicalUrl ?? ""}
					onChange={(e) => { updateSeo({ canonicalUrl: e.target.value }); }}
					placeholder="Canonical URL"
					className="h-10"
				/>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={seo.noIndex ?? false}
						onChange={(e) => { updateSeo({ noIndex: e.target.checked }); }}
						className="size-4"
					/>
					No Index
				</label>
			</fieldset>

			<fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
				<legend className="px-1 text-sm font-medium">FAQ produktowe</legend>
				{productFaq.map((item, index) => (
					<div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
						<Input
							value={item.question}
							onChange={(e) => { updateFaq(index, { question: e.target.value }); }}
							placeholder="Pytanie"
							className="h-9"
						/>
						<textarea
							value={item.answer}
							onChange={(e) => { updateFaq(index, { answer: e.target.value }); }}
							rows={3}
							className={inputClass}
							placeholder="Odpowiedź"
						/>
						<button
							type="button"
							onClick={() => { removeFaq(index); }}
							className="inline-flex w-fit items-center gap-1 text-sm text-destructive"
						>
							<Trash2 className="size-3.5" aria-hidden />
							Usuń
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={addFaq}
					className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary"
				>
					<Plus className="size-4" aria-hidden />
					Dodaj FAQ
				</button>
			</fieldset>
		</div>
	);
}
