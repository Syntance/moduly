import Link from "next/link";
import type { ReactNode } from "react";

export type LegalTemplateConfig = {
	brandName: string;
	contactEmail: string;
	siteUrl: string;
	/** Adres do zwrotów / reklamacji. */
	returnAddress?: {
		name: string;
		line1: string;
		line2: string;
	};
};

const linkClass =
	"text-neutral-800 underline-offset-2 hover:text-neutral-900 hover:underline";

type Section = {
	id: string;
	title: string;
};

const SECTIONS: Section[] = [
	{ id: "definicje", title: "Definicje" },
	{ id: "postanowienia-ogolne", title: "Postanowienia ogólne" },
	{ id: "uslugi-elektroniczne", title: "Usługi elektroniczne" },
	{ id: "zamowienia", title: "Zamówienia i umowy sprzedaży" },
	{ id: "reklamacje", title: "Reklamacje" },
	{ id: "dostawa", title: "Dostawa produktów" },
	{ id: "platnosci", title: "Płatności" },
	{ id: "odstapienie", title: "Prawo odstąpienia od umowy" },
	{ id: "postanowienia-koncowe", title: "Postanowienia końcowe" },
];

/**
 * Szablon regulaminu sklepu internetowego — wymaga dostosowania przez prawnika.
 * Port uproszczony z lumineconcept; sekcje jako placeholdery do wypełnienia.
 */
export function RegulaminTemplate({ config }: { config: LegalTemplateConfig }) {
	return (
		<>
			<p className="mb-4">
				Niniejszy Regulamin określa zasady korzystania ze Sklepu Internetowego{" "}
				<strong>{config.brandName}</strong> dostępnego pod adresem{" "}
				<a href={config.siteUrl}>{config.siteUrl}</a>, zasady składania zamówień,
				reklamacji, dostawy i płatności. Dokument wymaga weryfikacji prawnej przed
				publikacją.
			</p>
			<p className="mb-6">
				W razie pytań:{" "}
				<a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
			</p>

			<nav aria-label="Spis treści regulaminu" className="mb-10 border-t border-neutral-100 pt-6">
				<h2 className="mb-3 text-lg font-semibold text-neutral-900">Spis treści</h2>
				<ol className="list-decimal space-y-1.5 pl-6 text-neutral-700">
					{SECTIONS.map((section) => (
						<li key={section.id}>
							<a href={`#${section.id}`} className={linkClass}>
								{section.title}
							</a>
						</li>
					))}
				</ol>
			</nav>

			{SECTIONS.map((section) => (
				<section key={section.id} id={section.id} className="mb-10 scroll-mt-24">
					<h2 className="mb-3 text-xl font-bold text-neutral-900">{section.title}</h2>
					<p className="text-pretty text-neutral-700">
						[Treść sekcji „{section.title}” — uzupełnij zgodnie z modelem umowy
						sprzedaży, polityką zwrotów i specyfiką asortymentu {config.brandName}.]
					</p>
				</section>
			))}

			<p className="mt-6 text-center text-sm text-neutral-600">
				<Link href="/polityka-prywatnosci" className={`font-medium ${linkClass}`}>
					Polityka prywatności
				</Link>
				{" · "}
				<Link href="/" className={`font-medium ${linkClass}`}>
					Strona główna
				</Link>
			</p>
		</>
	);
}

export function regulaminIntro(config: LegalTemplateConfig): ReactNode {
	return (
		<>
			Potrzebujesz pomocy?{" "}
			<a
				href={`mailto:${config.contactEmail}`}
				className="font-medium text-neutral-900 underline underline-offset-2"
			>
				{config.contactEmail}
			</a>
			{" · "}
			<Link href="/polityka-prywatnosci" className="font-medium underline underline-offset-2">
				Polityka prywatności
			</Link>
		</>
	);
}
