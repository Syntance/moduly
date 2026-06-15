import type { Metadata } from "next";
import { ContactForm } from "@moduly/magazyn-forms/contact-form";
import { getPageSeo, getSiteSettings } from "@moduly/cms";
import { buildMetadata } from "@moduly/cms/metadata";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
	const [seo, siteSettings] = await Promise.all([getPageSeo("contact"), getSiteSettings()]);
	return buildMetadata({
		seo,
		siteSettings,
		siteUrl: getSiteUrl(),
		fallbackTitle: "Kontakt",
		fallbackDescription: "Skontaktuj się z nami — odpowiemy najszybciej jak to możliwe.",
		path: "/kontakt",
	});
}

export default function ContactPage() {
	return (
		<div className="mx-auto max-w-xl px-4 py-10">
			<header className="mb-8">
				<h1 className="font-serif text-3xl text-foreground">Kontakt</h1>
				<p className="mt-2 text-muted-foreground">
					Masz pytanie? Napisz — odpowiadamy zwykle w ciągu jednego dnia roboczego.
				</p>
			</header>
			<ContactForm variant="page" topicPreset="kontakt" />
		</div>
	);
}
