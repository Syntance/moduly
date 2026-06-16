export const stats = {
  przychod: 148_320_00,
  zamowienia: 1_847,
  klienci: 3_291,
  produkty: 412,
  srednia: 80_26,
  wskaznikKonwersji: 3.4,
  zwroty: 47,
  formularzeSztuk: 128,
};

export const przychodyMiesieczne = [
  { miesiac: "Sty", przychod: 82400, zamowienia: 1032 },
  { miesiac: "Lut", przychod: 91200, zamowienia: 1141 },
  { miesiac: "Mar", przychod: 103800, zamowienia: 1298 },
  { miesiac: "Kwi", przychod: 118500, zamowienia: 1482 },
  { miesiac: "Maj", przychod: 134200, zamowienia: 1679 },
  { miesiac: "Cze", przychod: 148320, zamowienia: 1847 },
];

export const zamowieniaDemo = [
  { id: "MOD-2847", klient: "Marta Kowalska", email: "marta.k@gmail.com", data: "2026-06-15", kwota: 32900, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 3, miasto: "Warszawa" },
  { id: "MOD-2846", klient: "Piotr Nowak", email: "pnowak@outlook.com", data: "2026-06-15", kwota: 18450, status: "w_realizacji", platnosc: "Opłacone", wysylka: "U kuriera", produkty: 2, miasto: "Kraków" },
  { id: "MOD-2845", klient: "Anna Wiśniewska", email: "ania.w@wp.pl", data: "2026-06-14", kwota: 9800, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 1, miasto: "Gdańsk" },
  { id: "MOD-2844", klient: "Tomasz Jabłoński", email: "t.jablonski@firma.pl", data: "2026-06-14", kwota: 54200, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 5, miasto: "Wrocław" },
  { id: "MOD-2843", klient: "Karolina Maj", email: "kmaj@icloud.com", data: "2026-06-13", kwota: 12300, status: "oczekuje", platnosc: "Oczekuje", wysylka: "Oczekuje na akceptację", produkty: 2, miasto: "Poznań" },
  { id: "MOD-2842", klient: "Michał Kowalczyk", email: "m.kowalczyk@wp.pl", data: "2026-06-13", kwota: 7650, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 1, miasto: "Łódź" },
  { id: "MOD-2841", klient: "Ewelina Zając", email: "ewelina.z@gmail.com", data: "2026-06-12", kwota: 28900, status: "anulowane", platnosc: "Do zwrotu", wysylka: "Anulowane", produkty: 4, miasto: "Katowice" },
  { id: "MOD-2840", klient: "Rafał Bąk", email: "rbak@firma.com", data: "2026-06-12", kwota: 16700, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 2, miasto: "Lublin" },
  { id: "MOD-2839", klient: "Natalia Okon", email: "natalia.o@gmail.com", data: "2026-06-11", kwota: 43100, status: "w_realizacji", platnosc: "Opłacone", wysylka: "W toku", produkty: 3, miasto: "Warszawa" },
  { id: "MOD-2838", klient: "Damian Krupa", email: "dkrupa@wp.pl", data: "2026-06-11", kwota: 8900, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 1, miasto: "Szczecin" },
  { id: "MOD-2837", klient: "Justyna Kwiatkowska", email: "justyna.k@onet.pl", data: "2026-06-10", kwota: 21400, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 3, miasto: "Bydgoszcz" },
  { id: "MOD-2836", klient: "Adam Lewandowski", email: "adam.l@gmail.com", data: "2026-06-10", kwota: 66800, status: "zrealizowane", platnosc: "Opłacone", wysylka: "Dostarczone", produkty: 6, miasto: "Warszawa" },
];

export const produktyDemo = [
  { id: "PRD-001", slug: "kurtka-zimowa-premium", nazwa: "Kurtka zimowa Premium", kategoria: "Odzież", cena: 39900, stan: 47, warianty: 8, status: "aktywny", sprzedane: 312, sku: "KZP-BLK-M" },
  { id: "PRD-002", slug: "buty-trekkingowe-alpin", nazwa: "Buty trekkingowe Alpin", kategoria: "Obuwie", cena: 54900, stan: 23, warianty: 12, status: "aktywny", sprzedane: 189, sku: "BTA-BRN-42" },
  { id: "PRD-003", slug: "plecak-miejski-30l", nazwa: "Plecak miejski 30L", kategoria: "Akcesoria", cena: 22900, stan: 0, warianty: 3, status: "niedostepny", sprzedane: 421, sku: "PLM-GRY-30" },
  { id: "PRD-004", slug: "koszulka-techniczna", nazwa: "Koszulka techniczna", kategoria: "Odzież", cena: 8900, stan: 142, warianty: 15, status: "aktywny", sprzedane: 876, sku: "KTM-WHT-L" },
  { id: "PRD-005", slug: "spodnie-outdoor", nazwa: "Spodnie outdoor", kategoria: "Odzież", cena: 29900, stan: 8, warianty: 10, status: "nisko", sprzedane: 234, sku: "SPO-KHK-XL" },
  { id: "PRD-006", slug: "czapka-welniana", nazwa: "Czapka wełniana", kategoria: "Akcesoria", cena: 4900, stan: 89, warianty: 5, status: "aktywny", sprzedane: 567, sku: "CZW-NVY-UNI" },
  { id: "PRD-007", slug: "rekawice-narciarskie", nazwa: "Rękawice narciarskie", kategoria: "Akcesoria", cena: 18900, stan: 31, warianty: 4, status: "aktywny", sprzedane: 143, sku: "RNR-BLK-L" },
  { id: "PRD-008", slug: "polar-fleece-200", nazwa: "Polar Fleece 200", kategoria: "Odzież", cena: 24900, stan: 5, warianty: 8, status: "nisko", sprzedane: 298, sku: "PF2-RED-M" },
  { id: "PRD-009", slug: "sandaly-trekkingowe", nazwa: "Sandały trekkingowe", kategoria: "Obuwie", cena: 31900, stan: 67, warianty: 9, status: "aktywny", sprzedane: 112, sku: "STR-BEI-41" },
  { id: "PRD-010", slug: "kask-rowerowy-aero", nazwa: "Kask rowerowy Aero", kategoria: "Sport", cena: 46900, stan: 18, warianty: 3, status: "aktywny", sprzedane: 87, sku: "KRA-WHT-M" },
] as const;

export type ProduktDemo = (typeof produktyDemo)[number];

export function getProduktById(id: string): ProduktDemo | undefined {
  return produktyDemo.find((p) => p.id === id);
}

export const kategorieDemo = [
  { id: "KAT-01", nazwa: "Odzież", slug: "odziez", produkty: 148, podkategorie: 6, aktywna: true },
  { id: "KAT-02", nazwa: "Obuwie", slug: "obuwie", produkty: 94, podkategorie: 4, aktywna: true },
  { id: "KAT-03", nazwa: "Akcesoria", slug: "akcesoria", produkty: 87, podkategorie: 8, aktywna: true },
  { id: "KAT-04", nazwa: "Sport", slug: "sport", produkty: 63, podkategorie: 5, aktywna: true },
  { id: "KAT-05", nazwa: "Wyprzedaż", slug: "wyprzedaz", produkty: 20, podkategorie: 0, aktywna: true },
];

export const formularzeDemo = [
  { id: "FRM-412", formularz: "Kontakt", nadawca: "jan.kowalski@gmail.com", temat: "Pytanie o rozmiary", data: "2026-06-15 14:32", status: "nowe", tresc: "Dzień dobry, chciałem zapytać o dostępność rozmiaru XL w kurtce zimowej..." },
  { id: "FRM-411", formularz: "Kontakt", nadawca: "anna.m@wp.pl", temat: "Dostawa do paczkomatu", data: "2026-06-15 11:18", status: "w_toku", tresc: "Kiedy moja paczka dotrze? Numer zamówienia MOD-2831..." },
  { id: "FRM-410", formularz: "Współpraca", nadawca: "biuro@firma-hurtowa.pl", temat: "Zapytanie hurtowe B2B", data: "2026-06-14 16:47", status: "nowe", tresc: "Jesteśmy dystrybutorem odzieży outdoorowej i chcielibyśmy nawiązać współpracę..." },
  { id: "FRM-409", formularz: "Kontakt", nadawca: "p.nowak@onet.pl", temat: "Reklamacja produktu", data: "2026-06-14 09:22", status: "zamkniete", tresc: "Buty Alpin rozpadły się po 2 miesiącach użytkowania..." },
  { id: "FRM-408", formularz: "Newsletter", nadawca: "kasia.z@gmail.com", temat: "Rezygnacja z newslettera", data: "2026-06-13 18:05", status: "zamkniete", tresc: "Proszę o usunięcie mnie z listy mailingowej..." },
  { id: "FRM-407", formularz: "Współpraca", nadawca: "marketing@agencja.pl", temat: "Propozycja influencer", data: "2026-06-13 10:33", status: "w_toku", tresc: "Representujemy influencerów z branży outdoor i fitness..." },
  { id: "FRM-406", formularz: "Kontakt", nadawca: "tomek.j@gmail.com", temat: "Błąd przy płatności", data: "2026-06-12 15:21", status: "zamkniete", tresc: "Przy próbie zapłaty kartą pojawiał się błąd..." },
  { id: "FRM-405", formularz: "Kontakt", nadawca: "marta.k@icloud.com", temat: "Zwrot towaru", data: "2026-06-12 08:44", status: "nowe", tresc: "Chciałabym zwrócić zakupiony polar, rozmiar okazał się za duży..." },
];

export const maileDemo = [
  { id: "ML-01", nazwa: "Potwierdzenie zamówienia", klucz: "order_confirmation", ostatniaEdycja: "2026-05-20", wyslane: 1847, otwarcia: "72%", status: "aktywny" },
  { id: "ML-02", nazwa: "Zamówienie wysłane", klucz: "order_shipped", ostatniaEdycja: "2026-05-18", wyslane: 1612, otwarcia: "68%", status: "aktywny" },
  { id: "ML-03", nazwa: "Zamówienie dostarczone", klucz: "order_delivered", ostatniaEdycja: "2026-04-12", wyslane: 1489, otwarcia: "54%", status: "aktywny" },
  { id: "ML-04", nazwa: "Zwrot przyjęty", klucz: "return_accepted", ostatniaEdycja: "2026-05-30", wyslane: 47, otwarcia: "81%", status: "aktywny" },
  { id: "ML-05", nazwa: "Resetowanie hasła", klucz: "password_reset", ostatniaEdycja: "2026-03-08", wyslane: 234, otwarcia: "89%", status: "aktywny" },
  { id: "ML-06", nazwa: "Newsletter powitalny", klucz: "welcome_newsletter", ostatniaEdycja: "2026-06-01", wyslane: 891, otwarcia: "61%", status: "aktywny" },
  { id: "ML-07", nazwa: "Przypomnienie o koszyku", klucz: "cart_abandoned", ostatniaEdycja: "2026-04-22", wyslane: 0, otwarcia: "—", status: "wersja_robocza" },
];

export const zwrotyDemo = [
  { id: "ZWR-047", zamowienie: "MOD-2801", klient: "Ewelina Zając", produkt: "Kurtka zimowa Premium (XL)", data: "2026-06-12", powod: "Zły rozmiar", kwota: 39900, status: "oczekuje", typ: "zwrot" },
  { id: "ZWR-046", zamowienie: "MOD-2788", klient: "Piotr Kowalski", produkt: "Buty trekkingowe Alpin (41)", data: "2026-06-11", powod: "Wada fabryczna", kwota: 54900, status: "w_trakcie", typ: "reklamacja" },
  { id: "ZWR-045", zamowienie: "MOD-2774", klient: "Monika Lis", produkt: "Spodnie outdoor (M)", data: "2026-06-10", powod: "Inne — opisane", kwota: 29900, status: "zatwierdzone", typ: "zwrot" },
  { id: "ZWR-044", zamowienie: "MOD-2761", klient: "Karol Dąb", produkt: "Plecak miejski 30L (grafitowy)", data: "2026-06-09", powod: "Uszkodzony przy dostawie", kwota: 22900, status: "odrzucone", typ: "reklamacja" },
  { id: "ZWR-043", zamowienie: "MOD-2749", klient: "Sylwia Wróbel", produkt: "Polar Fleece 200 (S)", data: "2026-06-08", powod: "Produkt nie spełnił oczekiwań", kwota: 24900, status: "zakonczone", typ: "zwrot" },
];

export const cmsStrony = [
  { id: "CMS-01", tytul: "Strona główna", slug: "/", ostatniaEdycja: "2026-06-14", status: "opublikowana", autor: "Admin" },
  { id: "CMS-02", tytul: "O nas", slug: "/o-nas", ostatniaEdycja: "2026-05-22", status: "opublikowana", autor: "Admin" },
  { id: "CMS-03", tytul: "Kontakt", slug: "/kontakt", ostatniaEdycja: "2026-06-01", status: "opublikowana", autor: "Admin" },
  { id: "CMS-04", tytul: "Polityka prywatności", slug: "/polityka-prywatnosci", ostatniaEdycja: "2026-04-15", status: "opublikowana", autor: "Admin" },
  { id: "CMS-05", tytul: "Regulamin", slug: "/regulamin", ostatniaEdycja: "2026-04-15", status: "opublikowana", autor: "Admin" },
  { id: "CMS-06", tytul: "Przewodnik po rozmiarach", slug: "/przewodnik-rozmiary", ostatniaEdycja: "2026-06-10", status: "wersja_robocza", autor: "Admin" },
  { id: "CMS-07", tytul: "FAQ", slug: "/faq", ostatniaEdycja: "2026-05-30", status: "opublikowana", autor: "Admin" },
];

export const formatKwota = (grosze: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(grosze / 100);

import type { BadgeTone } from "@/components/ui";

export const statusZamowienia: Record<string, { label: string; tone: BadgeTone }> = {
  zrealizowane: { label: "Zrealizowane", tone: "success" },
  w_realizacji: { label: "W toku", tone: "info" },
  oczekuje: { label: "Oczekuje", tone: "warning" },
  anulowane: { label: "Anulowane", tone: "danger" },
};

/** Etykiety płatności — jak paymentStatusBadge w Lumine */
export const platnoscBadge: Record<string, { label: string; tone: BadgeTone }> = {
  "Opłacone": { label: "Opłacone", tone: "success" },
  "Oczekuje": { label: "Oczekuje", tone: "warning" },
  "Do zwrotu": { label: "Do zwrotu", tone: "refund" },
  "Anulowane": { label: "Anulowane", tone: "danger" },
};

/** Etykiety wysyłki — jak fulfillmentStatusBadge w Lumine */
export const wysylkaBadge: Record<string, { label: string; tone: BadgeTone }> = {
  "Dostarczone": { label: "Dostarczone", tone: "success" },
  "U kuriera": { label: "U kuriera", tone: "success" },
  "W toku": { label: "W toku", tone: "info" },
  "Oczekuje na akceptację": { label: "Oczekuje na akceptację", tone: "warning" },
  "Anulowane": { label: "Anulowane", tone: "danger" },
};

export const statusProduktu: Record<string, { label: string; tone: BadgeTone }> = {
  aktywny: { label: "Opublikowany", tone: "success" },
  niedostepny: { label: "Szkic", tone: "warning" },
  nisko: { label: "Opublikowany", tone: "success" },
};

export const statusFormularza: Record<string, { label: string; tone: BadgeTone }> = {
  nowe: { label: "Nowe", tone: "info" },
  w_toku: { label: "W toku", tone: "warning" },
  zamkniete: { label: "Zamknięte", tone: "neutral" },
};

export const statusZwrotu: Record<string, { label: string; tone: BadgeTone }> = {
  oczekuje: { label: "Oczekuje", tone: "warning" },
  w_trakcie: { label: "W trakcie", tone: "info" },
  zatwierdzone: { label: "Zatwierdzone", tone: "success" },
  odrzucone: { label: "Odrzucone", tone: "danger" },
  zakonczone: { label: "Zakończone", tone: "neutral" },
};
