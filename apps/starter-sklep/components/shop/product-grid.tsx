import Link from "next/link";
import Image from "next/image";
import { formatPrice, medusa } from "@moduly/commerce";

type ProductRow = {
	id: string;
	handle: string;
	title: string;
	thumbnail?: string | null;
	priceFrom: number;
};

export async function ProductGrid() {
	let products: ProductRow[] = [];

	try {
		const { products: rows } = await medusa.store.product.list({ limit: 24 });
		products = rows.map((p) => {
			const variant = p.variants?.[0];
			const price = variant?.calculated_price?.calculated_amount ?? 0;
			return {
				id: p.id,
				handle: p.handle ?? p.id,
				title: p.title ?? "Produkt",
				thumbnail: p.thumbnail,
				priceFrom: price,
			};
		});
	} catch {
		products = [];
	}

	if (products.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-border p-12 text-center">
				<p className="font-serif text-lg text-foreground">Brak produktów</p>
				<p className="mt-2 text-sm text-muted-foreground">
					Uruchom backend Medusa i dodaj produkty w panelu magazynu.
				</p>
				<Link
					href="/magazyn"
					className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					Otwórz magazyn →
				</Link>
			</div>
		);
	}

	return (
		<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{products.map((product) => (
				<li key={product.id}>
					<Link
						href={`/sklep/${product.handle}`}
						className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
					>
						<div className="relative aspect-[4/5] bg-muted">
							{product.thumbnail ? (
								<Image
									src={product.thumbnail}
									alt={product.title}
									fill
									sizes="(max-width: 768px) 50vw, 33vw"
									className="object-cover transition-transform group-hover:scale-[1.02]"
								/>
							) : (
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									Brak zdjęcia
								</div>
							)}
						</div>
						<div className="flex flex-col gap-1 p-4">
							<h2 className="font-serif text-lg text-foreground">{product.title}</h2>
							<p className="text-sm tabular-nums text-muted-foreground">
								{product.priceFrom > 0 ? `od ${formatPrice(product.priceFrom)}` : "Cena na zapytanie"}
							</p>
						</div>
					</Link>
				</li>
			))}
		</ul>
	);
}
