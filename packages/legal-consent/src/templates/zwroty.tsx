import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalTemplateConfig } from "./regulamin";

/**
 * Szablon polityki zwrotów i reklamacji — port uproszczony z lumineconcept.
 */
export function ZwrotyTemplate({ config }: { config: LegalTemplateConfig }) {
	const address = config.returnAddress ?? {
		name: config.brandName,
		line1: "[Ulica i numer]",
		line2: "[Kod pocztowy, miejscowość]",
	};

	return (
		<>
			<p className="mb-6 text-pretty">
				Poniżej znajdziesz najważniejsze informacje dotyczące zgłaszania reklamacji
				oraz zwrotów. Pełne zasady opisuje{" "}
				<Link href="/regulamin" className="font-semibold">
					regulamin sklepu
				</Link>
				.
			</p>

			<section id="reklamacje" className="scroll-mt-24">
				<h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-neutral-900">
					Polityka reklamacji
				</h2>
				<ul className="list-disc space-y-4 pl-6 text-pretty marker:text-neutral-500">
					<li>
						W przypadku wady towaru Klient ma prawo do reklamacji w oparciu o
						przepisy dotyczące rękojmi w Kodeksie cywilnym.
					</li>
					<li>
						Reklamację należy zgłosić drogą elektroniczną na adres:{" "}
						<a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
					</li>
					<li>
						W reklamacji należy zawrzeć opis wady, datę wystąpienia, dane Klienta
						oraz żądanie w związku z wadą towaru.
					</li>
					<li>Sprzedawca ustosunkuje się do żądania reklamacyjnego w terminie 14 dni.</li>
					<li>Klient ponosi koszty i ryzyko związane z odesłaniem towaru. Adres zwrotu:</li>
				</ul>

				<div className="my-4 rounded-md border border-neutral-200 bg-neutral-50/60 p-4">
					<p className="font-semibold text-neutral-900">{address.name}</p>
					<p>{address.line1}</p>
					<p>{address.line2}</p>
				</div>

				<p className="text-pretty text-neutral-700">
					Zalecamy korzystanie z ubezpieczenia i śledzenia przesyłki zwrotnej.
					Zwrot środków nastąpi po otrzymaniu towaru lub potwierdzeniu dostarczenia
					przesyłki.
				</p>
			</section>

			<section id="zwroty" className="mt-10 scroll-mt-24">
				<h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-neutral-900">
					Zwrot towarów
				</h2>
				<div className="rounded-md border-l-4 border-neutral-500 bg-neutral-50 p-4 text-pretty">
					<p>
						[Prawo odstąpienia — dostosuj do asortymentu. Dla produktów
						personalizowanych / na zamówienie często wyłączone na podstawie art.
						38 pkt 3 ustawy o prawach konsumenta. Skonsultuj z prawnikiem.]
					</p>
				</div>
			</section>

			<section id="kontakt" className="mt-10 scroll-mt-24">
				<h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-neutral-900">
					Kontakt
				</h2>
				<p className="text-pretty">
					Pytania dotyczące zwrotów:{" "}
					<a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
				</p>
			</section>

			<p className="mt-6 text-center text-sm text-neutral-600">
				<Link
					href="/"
					className="font-medium underline underline-offset-2 hover:text-neutral-900"
				>
					Wróć na stronę główną
				</Link>
			</p>
		</>
	);
}

export function zwrotyIntro(config: LegalTemplateConfig): ReactNode {
	return (
		<>
			Masz pytania?{" "}
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
