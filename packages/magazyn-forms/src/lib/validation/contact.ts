import { z } from "zod";

/**
 * Kontaktowy formularz — Zod schema. Wartości `topic` = ContactTopicValue.
 */
export const CONTACT_TOPIC_LABELS = {
	produkt: "Pytanie o produkt",
	b2b: "Współpraca B2B",
	wysylka: "Wysyłka i zwroty",
	regulamin_zamowienie: "Składanie zamówienia",
	regulamin_platnosc: "Ceny, płatności i faktury",
	regulamin_wysylka: "Wysyłka i odbiór",
	regulamin_prawa: "Prawa konsumenta w regulaminie",
	rodo_dostep: "Dostęp do danych",
	rodo_usuniecie: "Usunięcie danych",
	rodo_sprostowanie: "Sprostowanie lub ograniczenie",
	rodo_sprzeciw: "Sprzeciw (marketing)",
	cookies_zgoda: "Zmiana zgód cookies",
	cookies_analityka: "Analityka na stronie",
	cookies_marketing: "Marketing i piksele",
	odstapienie_termin: "Termin 14 dni",
	odstapienie_formularz: "Jak złożyć odstąpienie",
	odstapienie_zwrot: "Zwrot przedmiotu i koszty",
	odstapienie_status: "Status mojego wniosku",
	reklamacja_wada: "Wada lub niezgodność z opisem",
	reklamacja_transport: "Uszkodzenie w transporcie",
	reklamacja_status: "Status reklamacji",
	reklamacja_formularz: "Formularz reklamacyjny online",
	dostepnosc_strona: "Problem na stronie",
	dostepnosc_nawigacja: "Nawigacja klawiaturą / czytnik",
	dostepnosc_kontrast: "Kontrast i czytelność",
	konto_logowanie: "Logowanie kodem na e-mail",
	konto_zamowienia: "Zamówienia w panelu",
	konto_zwrot: "Zwrot lub odstąpienie w koncie",
	konto_dane: "Dane konta",
	inne: "Inne",
} as const;

export type ContactTopicValue = keyof typeof CONTACT_TOPIC_LABELS;

export const ALL_CONTACT_TOPICS = Object.keys(CONTACT_TOPIC_LABELS) as [
	ContactTopicValue,
	...ContactTopicValue[],
];

export const CONTACT_TOPIC_PRESETS = {
	kontakt: ["produkt", "b2b", "wysylka", "inne"],
	regulamin: [
		"regulamin_zamowienie",
		"regulamin_platnosc",
		"regulamin_wysylka",
		"regulamin_prawa",
		"inne",
	],
	privacy: ["rodo_dostep", "rodo_usuniecie", "rodo_sprostowanie", "rodo_sprzeciw", "inne"],
	cookies: ["cookies_zgoda", "cookies_analityka", "cookies_marketing", "inne"],
	withdrawal: [
		"odstapienie_termin",
		"odstapienie_formularz",
		"odstapienie_zwrot",
		"odstapienie_status",
		"inne",
	],
	claims: [
		"reklamacja_wada",
		"reklamacja_transport",
		"reklamacja_status",
		"reklamacja_formularz",
		"inne",
	],
	accessibility: ["dostepnosc_strona", "dostepnosc_nawigacja", "dostepnosc_kontrast", "inne"],
	konto: ["konto_logowanie", "konto_zamowienia", "konto_zwrot", "konto_dane", "inne"],
} as const satisfies Record<string, readonly ContactTopicValue[]>;

export type ContactTopicPreset = keyof typeof CONTACT_TOPIC_PRESETS;

export function getContactTopicOptions(preset: ContactTopicPreset) {
	return CONTACT_TOPIC_PRESETS[preset].map((value) => ({
		value,
		label: CONTACT_TOPIC_LABELS[value],
	}));
}

export const ContactSchema = z
	.object({
		name: z.string().trim().min(2, "Podaj imię."),
		email: z.string().email("Podaj prawidłowy e-mail."),
		topic: z.string().trim().min(1, "Wybierz temat."),
		topicOther: z.string().trim().max(80).optional(),
		message: z.string().trim().min(20, "Wiadomość musi mieć minimum 20 znaków."),
	})
	.superRefine((data, ctx) => {
		if (data.topic !== "inne") return;
		const other = data.topicOther?.trim();
		if (!other || other.length < 2) {
			ctx.addIssue({
				code: "custom",
				message: "Podaj temat wiadomości.",
				path: ["topicOther"],
			});
		}
	});

export function formatContactTopicLabel(data: {
	topic: string;
	topicOther?: string;
}): string {
	if (data.topic === "inne" && data.topicOther?.trim()) {
		return data.topicOther.trim();
	}
	if (data.topic in CONTACT_TOPIC_LABELS) {
		return CONTACT_TOPIC_LABELS[data.topic as ContactTopicValue];
	}
	return data.topic;
}

export type ContactInput = z.input<typeof ContactSchema>;
export type ContactData = z.output<typeof ContactSchema>;
