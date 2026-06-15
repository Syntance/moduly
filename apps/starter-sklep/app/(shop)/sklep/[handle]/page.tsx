import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, medusa } from "@moduly/commerce";
import { getSiteSettings } from "@moduly/cms";
import { buildMetadata } from "@moduly/cms/metadata";
import { getSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { handle } = await params;
	const siteSettings = await getSiteSettings();

	try {
		const { products } = await medusa.store.product.list({ handle, limit: 1 });
		const product = products[0];
		if (!product) {
			return buildMetadata({
				siteSettings,
				siteUrl: getSiteUrl(),
				fallbackTitle: "Produkt",
				path: `/sklep/${handle}`,
			});
		}
		return buildMetadata({
			siteSettings,
			siteUrl: getSiteUrl(),
			fallbackTitle: product.title ?? "Produkt",
			fallbackDescription: product.description ?? undefined,
			path: `/sklep/${handle}`,
		});
	} catch {
		return buildMetadata({
			siteSettings,
			siteUrl: getSiteUrl(),
			fallbackTitle: "Produkt",
			path: `/sklep/${handle}`,
		});
	}
}

export default async function ProductPage({ params }: Props) {
	const { handle } = await params;

	let product: Awaited<ReturnType<typeof medusa.store.product.list>>["products"][0] | null =
		null;

	try {
		const result = await medusa.store.product.list({ handle, limit: 1 });
		product = result.products[0] ?? null;
	} catch {
		product = null;
	}

	if (!product) notFound();

	const variant = product.variants?.[0];
	const price = variant?.calculated_price?.calculated_amount ?? 0;

	return (
		<div className="mx-auto max-w-6xl px-4 py-10">
			<nav className="mb-6 text-sm text-muted-foreground">
				<Link href="/sklep" className="hover:text-foreground">
					Sklep
				</Link>
				<span className="mx-2">/</span>
				<span className="text-foreground">{product.title}</span>
			</nav>

			<div className="grid gap-10 lg:grid-cols-2">
				<div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
					{product.thumbnail ? (
						<Image
							src={product.thumbnail}
							alt={product.title ?? "Produkt"}
							fill
							priority
							sizes="(max-width: 1024px) 100vw, 50vw"
							className="object-cover"
						/>
					) : (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							Brak zdjęcia
						</div>
					)}
				</div>

				<div>
					<h1 className="font-serif text-3xl text-foreground">{product.title}</h1>
					{price > 0 ? (
						<p className="mt-4 text-2xl tabular-nums">{formatPrice(price)}</p>
					) : null}
					{product.description ? (
						<div
							className="prose prose-sm mt-6 max-w-none text-muted-foreground"
							dangerouslySetInnerHTML={{ __html: product.description }}
						/>
					) : null}
					<p className="mt-8 text-sm text-muted-foreground">
						Konfigurator produktu i dodawanie do koszyka — rozszerz w projekcie docelowym.
					</p>
				</div>
			</div>
		</div>
	);
}
