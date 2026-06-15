import type { Metadata } from "next";
import { getPageSeo, getSiteSettings } from "@moduly/cms";
import { buildMetadata } from "@moduly/cms/metadata";
import { ProductGrid } from "@/components/shop/product-grid";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
	const [seo, siteSettings] = await Promise.all([getPageSeo("shop"), getSiteSettings()]);
	return buildMetadata({
		seo,
		siteSettings,
		siteUrl: getSiteUrl(),
		fallbackTitle: "Sklep — Moduly",
		fallbackDescription: "Przeglądaj produkty w naszym sklepie internetowym.",
		path: "/sklep",
	});
}

export default function ShopPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-10">
			<header className="mb-10">
				<h1 className="font-serif text-3xl text-foreground">Sklep</h1>
				<p className="mt-2 text-muted-foreground">Wszystkie produkty dostępne w sklepie.</p>
			</header>
			<ProductGrid />
		</div>
	);
}
