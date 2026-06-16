/** Dane demo konfiguracji formularzy — układ jak Lumine / RetroHouse. */

export type FormTopic = {
  value: string;
  label: string;
  enabled: boolean;
};

export type FormPreset = {
  id: string;
  name: string;
  pages: string[];
  recipientEmail: string;
  topics: FormTopic[];
  enabled: boolean;
};

export type FormsConfig = {
  forms: FormPreset[];
};

export const CONTACT_TEMPLATE_VARS = [
  "{{temat}}",
  "{{numerSprawy}}",
  "{{numerFormularza}}",
  "{{linkKonto}}",
  "{{imie}}",
  "{{email}}",
  "{{wiadomosc}}",
] as const;

const kontaktTopics: FormTopic[] = [
  { value: "produkt", label: "Pytanie o produkt", enabled: true },
  { value: "rozmiar", label: "Dobór rozmiaru", enabled: true },
  { value: "wysylka", label: "Dostawa i status zamówienia", enabled: true },
  { value: "zwrot", label: "Zwrot lub reklamacja", enabled: true },
  { value: "b2b", label: "Współpraca B2B / hurt", enabled: true },
  { value: "inne", label: "Inna sprawa", enabled: true },
];

const legalTopics: FormTopic[] = [
  { value: "pytanie", label: "Pytanie do dokumentu", enabled: true },
  { value: "inne", label: "Inna sprawa", enabled: true },
];

const claimsTopics: FormTopic[] = [
  { value: "reklamacja", label: "Reklamacja produktu", enabled: true },
  { value: "zwrot", label: "Zwrot towaru", enabled: true },
  { value: "inne", label: "Inna sprawa", enabled: true },
];

const kontoTopics: FormTopic[] = [
  { value: "konto", label: "Moje konto i zamówienia", enabled: true },
  { value: "haslo", label: "Reset hasła", enabled: true },
  { value: "inne", label: "Inna sprawa", enabled: true },
];

export const defaultFormsConfig: FormsConfig = {
  forms: [
    {
      id: "kontakt",
      name: "Kontakt (strona główna /kontakt)",
      pages: ["/kontakt", "/"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: kontaktTopics,
      enabled: true,
    },
    {
      id: "regulamin",
      name: "Regulamin sklepu",
      pages: ["/regulamin"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: legalTopics,
      enabled: true,
    },
    {
      id: "privacy",
      name: "Polityka prywatności",
      pages: ["/polityka-prywatnosci"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: legalTopics,
      enabled: true,
    },
    {
      id: "cookies",
      name: "Polityka cookies",
      pages: ["/polityka-cookies"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: legalTopics,
      enabled: true,
    },
    {
      id: "withdrawal",
      name: "Odstąpienie od umowy",
      pages: ["/odstapienie"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: [{ value: "odstapienie", label: "Odstąpienie od umowy", enabled: true }],
      enabled: true,
    },
    {
      id: "claims",
      name: "Reklamacje",
      pages: ["/reklamacje"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: claimsTopics,
      enabled: true,
    },
    {
      id: "konto",
      name: "Moje konto",
      pages: ["/konto"],
      recipientEmail: "sklep@outdoorstore.pl",
      topics: kontoTopics,
      enabled: true,
    },
  ],
};
