import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalTemplateConfig } from "./regulamin";

const linkClass =
	"text-neutral-800 underline-offset-2 hover:text-neutral-900 hover:underline";

const SECTIONS = [
	{ id: "administrator", title: "Administrator danych" },
	{ id: "zakres-danych", title: "Zakres przetwarzanych danych" },
	{ id: "cele-podstawy", title: "Cele i podstawy prawne" },
	{ id: "okres", title: "Okres przechowywania" },
	{ id: "odbiorcy", title: "Odbiorcy danych" },
	{ id: "prawa", title: "Prawa osób, których dane dotyczą" },
	{ id: "cookies", title: "Pliki cookies" },
	{ id: "analityka", title: "Analityka i marketing" },
	{ id: "bezpieczenstwo", title: "Bezpieczeństwo danych" },
	{ id: "zmiany", title: "Zmiany polityki" },
] as const;

/**
 * Szablon polityki prywatności (RODO) — wymaga dostosowania do faktycznych procesorów danych.
 */
export function PolitykaPrywatnosciTemplate({
	config,
}: {
	config: LegalTemplateConfig;
}) {
	return (
		<>
			<p className="mb-4">
				Niniejsza Polityka prywatności wyjaśnia, w jaki sposób{" "}
				<strong>{config.brandName}</strong> przetwarza dane osobowe użytkowników
				serwisu <a href={config.siteUrl}>{config.siteUrl}</a>, zgodnie z RODO i
				polskim prawem ochrony danych.
			</p>
			<p className="mb-6">
				Kontakt w sprawach RODO:{" "}
				<a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
			</p>

			<nav
				aria-label="Spis treści polityki prywatności"
				className="mb-10 border-t border-neutral-100 pt-6"
			>
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
					{section.id === "administrator" ? (
						<p className="text-pretty text-neutral-700">
							Administratorem danych jest <strong>{config.brandName}</strong>.
							Kontakt:{" "}
							<a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
							[Dane rejestrowe, NIP, adres — uzupełnij.]
						</p>
					) : section.id === "cookies" ? (
						<p className="text-pretty text-neutral-700">
							Strona używa plików cookies niezbędnych (sesja, koszyk) oraz — za
							zgodą — analitycznych i marketingowych. Użytkownik może zmienić zgodę
							przez link „Ustawienia cookies” w stopce. Szczegóły kategorii
							konfiguruje komponent{" "}
							<code className="rounded bg-neutral-100 px-1 text-sm">
								@moduly/legal-consent
							</code>
							.
						</p>
					) : (
						<p className="text-pretty text-neutral-700">
							[Treść sekcji „{section.title}” — wymień faktycznych procesorów:
							hosting, płatności, kurier, e-mail, analityka.]
						</p>
					)}
				</section>
			))}

			<p className="mt-6 text-center text-sm text-neutral-600">
				<Link href="/regulamin" className={`font-medium ${linkClass}`}>
					Regulamin
				</Link>
				{" · "}
				<Link href="/" className={`font-medium ${linkClass}`}>
					Strona główna
				</Link>
			</p>
		</>
	);
}

export function politykaPrywatnosciIntro(config: LegalTemplateConfig): ReactNode {
	return (
		<>
			Pytania o dane?{" "}
			<a
				href={`mailto:${config.contactEmail}`}
				className="font-medium text-neutral-900 underline underline-offset-2"
			>
				{config.contactEmail}
			</a>
			{" · "}
			<Link href="/regulamin" className="font-medium underline underline-offset-2">
				Regulamin
			</Link>
		</>
	);
}
