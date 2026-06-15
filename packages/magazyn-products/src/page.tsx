import { getModulyConfig } from "@moduly/magazyn-core/config";
import { Plus } from "lucide-react";
import Link from "next/link";
import { loadAdmin } from "@moduly/magazyn-core";
import { listAdminProducts } from "./store";
import { ProductsList } from "./products-list";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
	const products = await loadAdmin(listAdminProducts);
	const base = `${getModulyConfig().basePath}/panel/produkty`;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-serif text-2xl text-foreground">Produkty</h1>
					<p className="mt-1 text-sm text-muted-foreground">Zarządzaj asortymentem sklepu</p>
				</div>
				<Link
					href={`${base}/nowy`}
					className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<Plus className="size-4" aria-hidden />
					Dodaj produkt
				</Link>
			</header>

			<ProductsList products={products} />
		</div>
	);
}
