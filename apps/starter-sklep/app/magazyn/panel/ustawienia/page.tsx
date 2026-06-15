import Link from "next/link";
import { Palette, Paintbrush, Search } from "lucide-react";
import { modulyConfig } from "@/moduly.config";

export const dynamic = "force-dynamic";

export default function SettingsOverviewPage() {
	const base = `${modulyConfig.basePath}/panel/ustawienia`;

	const tiles = [
		{ href: `${base}/seo`, label: "SEO", description: "Meta tagi, Open Graph, indeksowanie", icon: Search },
		{ href: `${base}/kolory`, label: "Kolory", description: "Paleta globalnych kolorów produktów", icon: Palette },
		{ href: `${base}/motywy`, label: "Motywy magazynu", description: "Wygląd panelu administracyjnego", icon: Paintbrush },
	];

	return (
		<div className="flex flex-col gap-8">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Ustawienia sklepu</h1>
				<p className="mt-1 text-sm text-muted-foreground">Konfiguracja SEO, kolorów i motywu panelu.</p>
			</header>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tiles.map(({ href, label, description, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
					>
						<span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
							<Icon className="size-5" aria-hidden />
						</span>
						<span className="font-serif text-lg text-foreground">{label}</span>
						<span className="text-sm text-muted-foreground">{description}</span>
					</Link>
				))}
			</div>
		</div>
	);
}
