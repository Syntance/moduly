import { notFound } from "next/navigation";
import { loadAdmin } from "@moduly/magazyn-core";
import { getAdminProduct, listCategoryOptions } from "./store";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const [product, categories] = await loadAdmin(() =>
		Promise.all([getAdminProduct(id), listCategoryOptions()]),
	);
	if (!product) notFound();

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Edytuj produkt</h1>
				<p className="mt-1 text-sm text-muted-foreground">/{product.handle}</p>
			</header>
			<ProductForm product={product} categories={categories} />
		</div>
	);
}
