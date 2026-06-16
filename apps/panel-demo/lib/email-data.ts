/** Dane demo edytora maili — układ jak w Lumine. */

export type EmailBlockType = "heading" | "text" | "spacer" | "orderItems" | "footer";

export type EmailBlock = {
  id: string;
  type: EmailBlockType;
  label: string;
  snippet: string;
};

export type MailDemo = {
  id: string;
  nazwa: string;
  klucz: string;
  subject: string;
  hasInternalVersion: boolean;
  blocks: EmailBlock[];
};

export const MERGE_VARIABLES = [
  { token: "imie", label: "Imię klienta" },
  { token: "nrZamowienia", label: "Numer zamówienia" },
  { token: "suma", label: "Suma do zapłaty" },
  { token: "sumaProduktow", label: "Suma produktów" },
  { token: "kosztWysylki", label: "Koszt wysyłki" },
  { token: "wysylka", label: "Metoda dostawy" },
  { token: "email", label: "E-mail klienta" },
  { token: "telefon", label: "Telefon" },
  { token: "adres", label: "Adres dostawy" },
] as const;

const orderBlocks: EmailBlock[] = [
  { id: "b1", type: "heading", label: "Nagłówek", snippet: "Dziękujemy za złożenie zamówienia." },
  { id: "b2", type: "text", label: "Tekst", snippet: "Otrzymaliśmy Twoje zamówienie i zabieramy się do pracy…" },
  { id: "b3", type: "spacer", label: "Odstęp", snippet: "24 px" },
  { id: "b4", type: "text", label: "Tekst", snippet: "Numer zamówienia: {{nrZamowienia}}" },
  { id: "b5", type: "spacer", label: "Odstęp", snippet: "24 px" },
  { id: "b6", type: "orderItems", label: "Pozycje zamówienia", snippet: "lista pozycji zamówienia" },
  { id: "b7", type: "spacer", label: "Odstęp", snippet: "24 px" },
  { id: "b8", type: "footer", label: "Stopka", snippet: "Outdoor Store" },
];

export const maileEditorDemo: MailDemo[] = [
  {
    id: "ML-01",
    nazwa: "Potwierdzenie zamówienia",
    klucz: "order_confirmation",
    subject: "[Outdoor Store] Dziękujemy za zamówienie #{{nrZamowienia}}",
    hasInternalVersion: true,
    blocks: orderBlocks,
  },
  {
    id: "ML-02",
    nazwa: "Zamówienie wysłane",
    klucz: "order_shipped",
    subject: "[Outdoor Store] Zamówienie #{{nrZamowienia}} zostało wysłane",
    hasInternalVersion: true,
    blocks: [
      { id: "b1", type: "heading", label: "Nagłówek", snippet: "Zamówienie #{{nrZamowienia}} jest w drodze" },
      { id: "b2", type: "text", label: "Tekst", snippet: "Właśnie przekazaliśmy Twoje zamówienie kurierowi…" },
      { id: "b3", type: "spacer", label: "Odstęp", snippet: "24 px" },
      { id: "b4", type: "footer", label: "Stopka", snippet: "Outdoor Store" },
    ],
  },
  {
    id: "ML-03",
    nazwa: "Zamówienie dostarczone",
    klucz: "order_delivered",
    subject: "[Outdoor Store] Zamówienie #{{nrZamowienia}} dostarczone",
    hasInternalVersion: false,
    blocks: orderBlocks.slice(0, 4).concat(orderBlocks.slice(7)),
  },
  {
    id: "ML-04",
    nazwa: "Zwrot przyjęty",
    klucz: "return_accepted",
    subject: "[Outdoor Store] Przyjęliśmy zwrot #{{nrZamowienia}}",
    hasInternalVersion: false,
    blocks: orderBlocks.slice(0, 3).concat(orderBlocks.slice(7)),
  },
  {
    id: "ML-05",
    nazwa: "Resetowanie hasła",
    klucz: "password_reset",
    subject: "[Outdoor Store] Reset hasła",
    hasInternalVersion: false,
    blocks: [
      { id: "b1", type: "heading", label: "Nagłówek", snippet: "Reset hasła" },
      { id: "b2", type: "text", label: "Tekst", snippet: "Kliknij link, aby ustawić nowe hasło…" },
      { id: "b3", type: "footer", label: "Stopka", snippet: "Outdoor Store" },
    ],
  },
  {
    id: "ML-06",
    nazwa: "Newsletter powitalny",
    klucz: "welcome_newsletter",
    subject: "[Outdoor Store] Witaj w Outdoor Store!",
    hasInternalVersion: false,
    blocks: orderBlocks.slice(0, 3).concat(orderBlocks.slice(7)),
  },
  {
    id: "ML-07",
    nazwa: "Przypomnienie o koszyku",
    klucz: "cart_abandoned",
    subject: "[Outdoor Store] Zostawiłeś coś w koszyku",
    hasInternalVersion: false,
    blocks: orderBlocks.slice(0, 3).concat(orderBlocks.slice(7)),
  },
];

export function getMailById(id: string): MailDemo | undefined {
  return maileEditorDemo.find((m) => m.id === id);
}

/** Statyczny podgląd HTML — styl jak Lumine (Outdoor Store). */
export function buildEmailPreviewHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:16px;background:#f5f1ec;font-family:system-ui,sans-serif}
    .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
    .hdr{background:#725750;color:#fff;padding:20px 24px;font-size:14px;letter-spacing:.05em}
    .body{padding:24px;color:#725750;line-height:1.55}
    h1{color:#AF7C61;font-size:22px;margin:0 0 16px;font-weight:600}
    p{margin:0 0 12px;font-size:14px}
    .item{border-top:1px solid #e8e0d8;padding:12px 0;font-size:13px}
    .item strong{display:block;margin-bottom:4px}
    .muted{color:#8f7a74;font-size:12px}
    .total{border-top:2px solid #e8e0d8;margin-top:12px;padding-top:12px;font-weight:600}
    .ftr{padding:16px 24px;font-size:11px;color:#8f7a74;border-top:1px solid #e8e0d8}
  </style></head><body><div class="wrap">
    <div class="hdr">Outdoor Store</div>
    <div class="body">
      <h1>Dziękujemy za złożenie zamówienia.</h1>
      <p>Otrzymaliśmy Twoje zamówienie i zabieramy się do pracy. Poniżej znajdziesz pełne podsumowanie. Gdy paczka wyruszy w drogę, dostaniesz osobnego maila ze statusem i numerem do śledzenia.</p>
      <p><strong>Numer zamówienia:</strong> 1042</p>
      <div class="item"><strong>Kurtka zimowa Premium</strong><span class="muted">Rozmiar: M · Kolor: Czarny</span><br>399,00 zł × 1</div>
      <div class="item"><strong>Buty trekkingowe Alpin</strong><span class="muted">Rozmiar: 42 · Kolor: Brązowy</span><br>549,00 zł × 1</div>
      <p class="total">Razem: 948,00 zł</p>
    </div>
    <div class="ftr">Outdoor Store · sklep@outdoorstore.pl</div>
  </div></body></html>`;
}
