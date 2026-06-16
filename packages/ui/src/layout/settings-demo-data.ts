import type { SettingsSectionData } from "./settings-section-view";

export const settingsOgolne: SettingsSectionData = {
	id: "ogolne",
	tytul: "Dane sklepu",
	opis: "Nazwa, logo, dane kontaktowe, waluta",
	pola: [
		{ label: "Nazwa sklepu", val: "Outdoor Store sp. z o.o." },
		{ label: "Domena", val: "outdoorstore.pl" },
		{ label: "Waluta", val: "PLN – Polski złoty" },
		{ label: "Strefa czasowa", val: "Europe/Warsaw (UTC+2)" },
	],
};

export const settingsPlatnosci: SettingsSectionData = {
	id: "platnosci",
	tytul: "Płatności",
	opis: "Aktywne metody płatności",
	pola: [
		{ label: "Przelewy24", val: "Aktywne · ID: 123456" },
		{ label: "BLIK", val: "Aktywne (przez P24)" },
		{ label: "Stripe", val: "Nieaktywne" },
		{ label: "PayPo (BNPL)", val: "Aktywne · limit 2 000 zł" },
	],
};

export const settingsDostawa: SettingsSectionData = {
	id: "dostawa",
	tytul: "Dostawa",
	opis: "Metody dostawy, strefy i ceny",
	pola: [
		{ label: "InPost Paczkomat", val: "9,99 zł · darmowa od 199 zł" },
		{ label: "Kurier DPD", val: "14,99 zł · darmowa od 299 zł" },
		{ label: "Odbiór osobisty", val: "Bezpłatny · Warszawa" },
		{ label: "Poczta Polska", val: "12,50 zł" },
	],
};

export const settingsPowiadomienia: SettingsSectionData = {
	id: "powiadomienia",
	tytul: "Powiadomienia",
	opis: "Alerty e-mail i push dla zespołu",
	pola: [
		{ label: "Nowe zamówienie", val: "sklep@outdoorstore.pl" },
		{ label: "Niski stan magazynu", val: "magazyn@outdoorstore.pl" },
		{ label: "Nowe zgłoszenie formularza", val: "sklep@outdoorstore.pl" },
		{ label: "Zwrot / reklamacja", val: "sklep@outdoorstore.pl" },
	],
};

export const settingsBezpieczenstwo: SettingsSectionData = {
	id: "bezpieczenstwo",
	tytul: "Bezpieczeństwo",
	opis: "Sesje, 2FA i dostęp do panelu",
	pola: [
		{ label: "Sesja panelu", val: "8 h · wylogowanie po bezczynności" },
		{ label: "2FA administratorów", val: "Opcjonalne" },
		{ label: "IP allowlist", val: "Wyłączone" },
		{ label: "Ostatnie logowanie", val: "2026-06-15 09:14 · Warszawa" },
	],
};

export const settingsApi: SettingsSectionData = {
	id: "api",
	tytul: "API & Webhooks",
	opis: "Klucze integracji i endpointy zdarzeń",
	pola: [
		{ label: "Webhook zamówień", val: "https://hooks.outdoorstore.pl/orders" },
		{ label: "Webhook stanów", val: "Nieaktywny" },
		{ label: "Klucz API (prod)", val: "os_live_••••••••••••4f2a" },
		{ label: "Ostatnie wywołanie", val: "2026-06-14 18:02 · 200 OK" },
	],
};
