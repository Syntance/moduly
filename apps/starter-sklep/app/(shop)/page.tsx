import Link from "next/link";
import type { Metadata } from "next";
import { getPageContent, getPageSeo, getSiteSettings } from "@moduly/cms";
import { buildMetadata } from "@moduly/cms/metadata";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
	const [seo, siteSettings] = await Promise.all([getPageSeo("home"), getSiteSettings()]);
	return buildMetadata({
		seo,
		siteSettings,
		siteUrl: getSiteUrl(),
		fallbackTitle: "Moduly Sklep — strona główna",
		fallbackDescription: "Sklep internetowy z pełnym CMS i panelem magazynu.",
		path: "/",
	});
}

export default async function HomePage() {
	const content = await getPageContent("home");
	const hero = content.hero;

	return (
		<div>
			<section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
				<div className="max-w-2xl">
					<p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
						Moduly Sklep
					</p>
					<h1 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">
						{hero?.headline ?? "Twój sklep gotowy do sprzedaży"}
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						{hero?.subtitle ?? hero?.description ??
							"Starter Next.js 16 z Medusą, panelem magazynu, płatnościami i CMS."}
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							href="/sklep"
							className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Przeglądaj sklep
						</Link>
						<Link
							href="/magazyn"
							className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-medium hover:bg-muted"
						>
							Panel magazynu
						</Link>
					</div>
				</div>
			</section>

			{content.testimonials?.length ? (
				<section className="border-t border-border bg-muted/20 py-16">
					<div className="mx-auto max-w-6xl px-4">
						<h2 className="font-serif text-2xl text-foreground">Opinie klientów</h2>
						<ul className="mt-8 grid gap-6 md:grid-cols-2">
							{content.testimonials.slice(0, 4).map((item) => (
								<li key={item.id} className="rounded-xl border border-border bg-card p-6">
									<p className="text-foreground">&ldquo;{item.quote}&rdquo;</p>
									<p className="mt-3 text-sm text-muted-foreground">
										— {item.name}
										{item.company ? `, ${item.company}` : ""}
									</p>
								</li>
							))}
						</ul>
					</div>
				</section>
			) : null}
		</div>
	);
}
