import Link from "next/link";
import type { ReactNode } from "react";
import { getSiteSettings } from "@moduly/cms";

export default async function ShopLayout({ children }: { children: ReactNode }) {
	const siteSettings = await getSiteSettings();
	const announcement = siteSettings.announcementBar;

	return (
		<>
			{announcement?.enabled && announcement.text ? (
				<div className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
					{announcement.text}
				</div>
			) : null}

			<header className="border-b border-border">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
					<Link href="/" className="font-serif text-xl text-foreground">
						Moduly Sklep
					</Link>
					<nav aria-label="Główna nawigacja" className="flex items-center gap-6 text-sm">
						<Link href="/sklep" className="hover:text-primary">
							Sklep
						</Link>
						<Link href="/kontakt" className="hover:text-primary">
							Kontakt
						</Link>
						<Link href="/konto" className="hover:text-primary">
							Konto
						</Link>
						<Link href="/koszyk" className="font-medium hover:text-primary">
							Koszyk
						</Link>
					</nav>
				</div>
			</header>

			<main>{children}</main>

			<footer className="mt-16 border-t border-border bg-muted/30">
				<div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
					<p>{siteSettings.footerText ?? "Moduly Sklep · Wszystkie prawa zastrzeżone"}</p>
				</div>
			</footer>
		</>
	);
}
