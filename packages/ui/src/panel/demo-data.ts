import type { BadgeTone } from "./chrome";

/** Demo KPI — do podglądu panelu przed podłączeniem Medusy. */
export const panelStats = {
	przychod: 148_320_00,
	zamowienia: 1_847,
	klienci: 3_291,
	srednia: 80_26,
} as const;

export const przychodyMiesieczne = [
	{ miesiac: "Sty", przychod: 82_400, zamowienia: 1_032 },
	{ miesiac: "Lut", przychod: 91_200, zamowienia: 1_141 },
	{ miesiac: "Mar", przychod: 103_800, zamowienia: 1_298 },
	{ miesiac: "Kwi", przychod: 118_500, zamowienia: 1_482 },
	{ miesiac: "Maj", przychod: 134_200, zamowienia: 1_679 },
	{ miesiac: "Cze", przychod: 148_320, zamowienia: 1_847 },
] as const;

export type DemoOrder = {
	id: string;
	klient: string;
	email: string;
	data: string;
	kwota: number;
	status: keyof typeof statusZamowienia;
	miasto: string;
};

export const zamowieniaDemo: DemoOrder[] = [
	{ id: "MOD-2847", klient: "Marta Kowalska", email: "marta.k@gmail.com", data: "2026-06-15", kwota: 32_900, status: "zrealizowane", miasto: "Warszawa" },
	{ id: "MOD-2846", klient: "Piotr Nowak", email: "pnowak@outlook.com", data: "2026-06-15", kwota: 18_450, status: "w_realizacji", miasto: "Kraków" },
	{ id: "MOD-2845", klient: "Anna Wiśniewska", email: "ania.w@wp.pl", data: "2026-06-14", kwota: 9_800, status: "zrealizowane", miasto: "Gdańsk" },
	{ id: "MOD-2844", klient: "Tomasz Jabłoński", email: "t.jablonski@firma.pl", data: "2026-06-14", kwota: 54_200, status: "zrealizowane", miasto: "Wrocław" },
	{ id: "MOD-2843", klient: "Karolina Maj", email: "kmaj@icloud.com", data: "2026-06-13", kwota: 12_300, status: "oczekuje", miasto: "Poznań" },
	{ id: "MOD-2842", klient: "Michał Kowalczyk", email: "m.kowalczyk@wp.pl", data: "2026-06-13", kwota: 7_650, status: "zrealizowane", miasto: "Łódź" },
];

export const statusZamowienia = {
	zrealizowane: { label: "Zrealizowane", tone: "success" },
	w_realizacji: { label: "W toku", tone: "info" },
	oczekuje: { label: "Oczekuje", tone: "warning" },
	anulowane: { label: "Anulowane", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>;

export const zamowieniaWgStatusu = [
	{ label: "Zrealizowane", val: 1_591, color: "bg-emerald-500", pct: 86 },
	{ label: "W realizacji", val: 189, color: "bg-sky-500", pct: 10 },
	{ label: "Oczekuje", val: 42, color: "bg-amber-500", pct: 2.3 },
	{ label: "Anulowane", val: 25, color: "bg-red-500", pct: 1.4 },
] as const;

/** Opcjonalne badge na kafelkach modułów (segment URL → liczba). */
export const moduleTileBadges: Record<string, string> = {
	zamowienia: "12",
	formularze: "3",
	zwroty: "2",
};

export const dostawyStat = [
	{ name: "InPost Paczkomat", value: 58, color: "#AF7C61" },
	{ name: "Kurier DPD", value: 28, color: "#725750" },
	{ name: "Odbiór osobisty", value: 9, color: "#C9A48D" },
	{ name: "Poczta Polska", value: 5, color: "#8f7a74" },
] as const;

export const platnosciStat = [
	{ name: "Przelewy24", value: 51 },
	{ name: "BLIK", value: 30 },
	{ name: "Karta", value: 13 },
	{ name: "PayPo", value: 6 },
] as const;

export const topProduktyStat = [
	{ nazwa: "Koszulka techniczna", sprzedane: 876, przychod: 779_424 },
	{ nazwa: "Czapka wełniana", sprzedane: 567, przychod: 277_830 },
	{ nazwa: "Plecak miejski 30L", sprzedane: 421, przychod: 964_090 },
	{ nazwa: "Buty trekkingowe Alpin", sprzedane: 312, przychod: 1_712_880 },
	{ nazwa: "Kurtka zimowa Premium", sprzedane: 298, przychod: 1_190_220 },
] as const;

/** Grosze → PLN (UI). */
export function formatKwota(grosze: number): string {
	return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(grosze / 100);
}

export function moduleBadgeFromHref(href: string): string | undefined {
	const segment = href.split("/").filter(Boolean).at(-1);
	if (!segment) return undefined;
	return moduleTileBadges[segment];
}
