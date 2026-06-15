import { loadAdmin } from "@moduly/magazyn-core";
import { listCategoryOptions } from "./store";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
	const categories = await loadAdmin(listCategoryOptions);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Nowy produkt</h1>
			</header>
			<ProductForm categories={categories} />
		</div>
	);
}
