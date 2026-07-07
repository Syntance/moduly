/**
 * Szablony e-mail w czystym HTML + inline CSS (bez React Email, żeby nie
 * rozbudowywać runtime'u backendu o ekstra zależności). Branding: ciepły
 * brąz/kremowy, nagłówek „LUMINe", stopka z kontaktem.
 *
 * Wszystkie szablony zwracają `{ subject, html, text }` — `text` jest
 * fallbackiem dla klientów pocztowych blokujących HTML (lub Gmail promotion
 * filter).
 */

import { bankTransferEmailLines } from "./bank-transfer";

export type OrderEmailItem = {
  title: string;
  quantity: number;
  unitPriceMinor: number;
  thumbnail?: string | null;
};

export type OrderEmailPayload = {
  orderId: string;
  displayId?: string | number;
  email: string;
  currencyCode: string;
  items: OrderEmailItem[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  shippingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    address1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  storefrontUrl?: string;
};

const BRAND = {
  name: "Moduly Concept",
  accent: "#8B5A3C",
  accentDark: "#6B3F28",
  bg: "#FAF7F2",
  text: "#2A1F16",
  mute: "#8B7A66",
  border: "#E8DDD0",
};

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(major);
}

function formatOrderNumber(payload: OrderEmailPayload): string {
  if (payload.displayId) return `#${payload.displayId}`;
  return `#${payload.orderId.slice(-8).toUpperCase()}`;
}

function wrap(options: {
  preheader: string;
  heading: string;
  intro: string;
  cta?: { label: string; href: string };
  body: string;
}): string {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${options.heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
<div style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
      <tr><td style="padding:28px 32px;border-bottom:1px solid ${BRAND.border};">
        <div style="font-family:Georgia,serif;font-size:24px;letter-spacing:4px;color:${BRAND.accentDark};font-weight:600;">LUMINe</div>
        <div style="font-size:11px;letter-spacing:2px;color:${BRAND.mute};margin-top:2px;text-transform:uppercase;">${BRAND.name}</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:${BRAND.text};">${options.heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.text};">${options.intro}</p>
        ${options.body}
        ${
          options.cta
            ? `<div style="margin:28px 0 0;"><a href="${options.cta.href}" style="display:inline-block;padding:12px 28px;background:${BRAND.accent};color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">${options.cta.label}</a></div>`
            : ""
        }
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid ${BRAND.border};background:${BRAND.bg};font-size:12px;line-height:1.6;color:${BRAND.mute};">
        <div>${BRAND.name} · <a href="https://modulyconcept.pl" style="color:${BRAND.accent};text-decoration:none;">modulyconcept.pl</a></div>
        <div style="margin-top:4px;">Masz pytanie? Odpowiedz na tego maila albo napisz na <a href="mailto:kontakt@modulyconcept.pl" style="color:${BRAND.accent};text-decoration:none;">kontakt@modulyconcept.pl</a>.</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function renderItemsTable(payload: OrderEmailPayload): string {
  const rows = payload.items
    .map(
      (it) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">${escapeHtml(it.title)}<div style="font-size:12px;color:${BRAND.mute};margin-top:2px;">Ilość: ${it.quantity}</div></td>
<td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;text-align:right;white-space:nowrap;">${formatPrice(it.unitPriceMinor * it.quantity, payload.currencyCode)}</td>
</tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;border-top:2px solid ${BRAND.text};">
    ${rows}
    <tr><td style="padding:14px 0 4px;font-size:13px;color:${BRAND.mute};">Wartość produktów</td><td style="padding:14px 0 4px;font-size:13px;color:${BRAND.mute};text-align:right;">${formatPrice(payload.subtotalMinor, payload.currencyCode)}</td></tr>
    <tr><td style="padding:2px 0;font-size:13px;color:${BRAND.mute};">Dostawa ${payload.shippingMethod ? `— ${escapeHtml(payload.shippingMethod)}` : ""}</td><td style="padding:2px 0;font-size:13px;color:${BRAND.mute};text-align:right;">${formatPrice(payload.shippingMinor, payload.currencyCode)}</td></tr>
    <tr><td style="padding:10px 0 0;font-size:16px;font-weight:600;border-top:1px solid ${BRAND.border};">Do zapłaty</td><td style="padding:10px 0 0;font-size:16px;font-weight:600;border-top:1px solid ${BRAND.border};text-align:right;">${formatPrice(payload.totalMinor, payload.currencyCode)}</td></tr>
  </table>`;
}

function renderAddress(payload: OrderEmailPayload): string {
  const a = payload.shippingAddress;
  if (!a) return "";
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const line = [a.address1].filter(Boolean).join(", ");
  const city = [a.postalCode, a.city].filter(Boolean).join(" ");
  return `<div style="margin:16px 0;padding:16px;background:${BRAND.bg};border-radius:6px;font-size:13px;line-height:1.6;">
    <div style="font-weight:600;color:${BRAND.text};margin-bottom:4px;">Adres dostawy</div>
    ${name ? `<div>${escapeHtml(name)}</div>` : ""}
    ${line ? `<div>${escapeHtml(line)}</div>` : ""}
    ${city ? `<div>${escapeHtml(city)}</div>` : ""}
    ${a.country ? `<div>${escapeHtml(a.country)}</div>` : ""}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainOrderLines(payload: OrderEmailPayload): string {
  return payload.items
    .map(
      (it) =>
        `- ${it.title} × ${it.quantity} — ${formatPrice(it.unitPriceMinor * it.quantity, payload.currencyCode)}`,
    )
    .join("\n");
}

export function renderOrderPlacedEmail(payload: OrderEmailPayload) {
  const num = formatOrderNumber(payload);
  const ctaHref = payload.storefrontUrl
    ? `${payload.storefrontUrl.replace(/\/$/, "")}/`
    : "https://modulyconcept.pl";

  return {
    subject: `Dziękujemy za zamówienie ${num}`,
    html: wrap({
      preheader: `Otrzymaliśmy zamówienie ${num}. Zabieramy się do pracy.`,
      heading: `Dziękujemy za zamówienie ${num}`,
      intro: `Otrzymaliśmy Twoje zamówienie i zabieramy się do pracy. Poniżej znajdziesz pełne podsumowanie. Gdy paczka wyruszy w drogę, dostaniesz osobnego maila ze statusem i numerem do śledzenia.`,
      cta: { label: "Odwiedź nasz sklep", href: ctaHref },
      body: renderItemsTable(payload) + renderAddress(payload),
    }),
    text: `Dziękujemy za zamówienie ${num}.

Otrzymaliśmy Twoje zamówienie — zabieramy się do pracy.

Produkty:
${plainOrderLines(payload)}

Wartość produktów: ${formatPrice(payload.subtotalMinor, payload.currencyCode)}
Dostawa: ${formatPrice(payload.shippingMinor, payload.currencyCode)}
Do zapłaty: ${formatPrice(payload.totalMinor, payload.currencyCode)}

${BRAND.name} · modulyconcept.pl
Masz pytanie? Odpowiedz na tego maila.`,
  };
}

export function renderOrderShippedEmail(payload: OrderEmailPayload) {
  const num = formatOrderNumber(payload);
  const hasTracking = !!payload.trackingNumber;

  const trackingBlock = hasTracking
    ? `<div style="margin:16px 0;padding:16px;background:${BRAND.bg};border-radius:6px;font-size:14px;line-height:1.6;">
      <div style="font-weight:600;margin-bottom:4px;">Numer przesyłki</div>
      <div style="font-family:monospace;font-size:15px;color:${BRAND.accentDark};">${escapeHtml(payload.trackingNumber!)}</div>
      ${payload.trackingUrl ? `<div style="margin-top:8px;"><a href="${payload.trackingUrl}" style="color:${BRAND.accent};">Śledź paczkę →</a></div>` : ""}
    </div>`
    : "";

  return {
    subject: `Zamówienie ${num} zostało wysłane`,
    html: wrap({
      preheader: `Twoje zamówienie ${num} jest w drodze.`,
      heading: `Zamówienie ${num} jest w drodze`,
      intro: `Właśnie przekazaliśmy Twoje zamówienie kurierowi. Powinno dotrzeć w ciągu 1–2 dni roboczych.`,
      cta: payload.trackingUrl
        ? { label: "Śledź paczkę", href: payload.trackingUrl }
        : undefined,
      body: trackingBlock + renderAddress(payload),
    }),
    text: `Zamówienie ${num} zostało wysłane.

Właśnie przekazaliśmy Twoje zamówienie kurierowi.
${hasTracking ? `Numer przesyłki: ${payload.trackingNumber}` : ""}
${payload.trackingUrl ? `Śledź paczkę: ${payload.trackingUrl}` : ""}

${BRAND.name} · modulyconcept.pl`,
  };
}

export function renderOrderCanceledEmail(payload: OrderEmailPayload) {
  const num = formatOrderNumber(payload);
  return {
    subject: `Zamówienie ${num} zostało anulowane`,
    html: wrap({
      preheader: `Anulowaliśmy zamówienie ${num}.`,
      heading: `Zamówienie ${num} zostało anulowane`,
      intro: `Informujemy, że Twoje zamówienie zostało anulowane. Jeżeli płatność została już zaksięgowana, zwrot pojawi się na koncie w ciągu 3–5 dni roboczych. Jeśli masz jakiekolwiek pytania, po prostu odpowiedz na tego maila.`,
      body: renderItemsTable(payload),
    }),
    text: `Zamówienie ${num} zostało anulowane.

Jeśli płatność została zaksięgowana, zwrot pojawi się na koncie w 3–5 dni roboczych.
Masz pytania? Odpowiedz na tego maila.

${BRAND.name} · modulyconcept.pl`,
  };
}

export function renderBankTransferPendingEmail(payload: OrderEmailPayload) {
  const num = formatOrderNumber(payload);
  const bt = bankTransferEmailLines(payload.displayId ?? payload.orderId.slice(-8));

  const transferBlock = `<div style="margin:16px 0;padding:16px;background:${BRAND.bg};border-radius:6px;font-size:14px;line-height:1.7;">
      <div style="font-weight:600;margin-bottom:8px;">Dane do przelewu</div>
      <div><span style="color:${BRAND.mute};">Odbiorca:</span> ${escapeHtml(bt.recipientName)}</div>
      <div><span style="color:${BRAND.mute};">Adres:</span> ${escapeHtml(bt.address)}</div>
      <div><span style="color:${BRAND.mute};">IBAN:</span> <span style="font-family:monospace;font-weight:600;">${escapeHtml(bt.ibanDisplay)}</span></div>
      <div><span style="color:${BRAND.mute};">SWIFT / BIC:</span> <span style="font-family:monospace;font-weight:600;">${escapeHtml(bt.swift)}</span></div>
      <div><span style="color:${BRAND.mute};">Tytuł przelewu:</span> ${escapeHtml(bt.transferTitle)}</div>
      <div><span style="color:${BRAND.mute};">Kwota:</span> <strong>${escapeHtml(formatPrice(payload.totalMinor, payload.currencyCode))}</strong></div>
      <div style="margin-top:8px;color:${BRAND.mute};font-size:13px;">Termin płatności: ${bt.paymentDays} dni roboczych od złożenia zamówienia.</div>
    </div>`;

  return {
    subject: `Zamówienie ${num} — dane do przelewu`,
    html: wrap({
      preheader: `Opłać zamówienie ${num} przelewem w ciągu ${bt.paymentDays} dni roboczych.`,
      heading: `Zamówienie ${num} czeka na wpłatę`,
      intro: `Dziękujemy za złożenie zamówienia. Opłać je przelewem tradycyjnym — po zaksięgowaniu wpłaty wyślemy potwierdzenie i rozpoczniemy realizację.`,
      body: transferBlock + renderItemsTable(payload) + renderAddress(payload),
    }),
    text: `Zamówienie ${num} czeka na wpłatę.

Opłać przelewem w ciągu ${bt.paymentDays} dni roboczych:

Odbiorca: ${bt.recipientName}
Adres: ${bt.address}
IBAN: ${bt.ibanDisplay}
SWIFT / BIC: ${bt.swift}
Tytuł przelewu: ${bt.transferTitle}
Kwota: ${formatPrice(payload.totalMinor, payload.currencyCode)}

${plainOrderLines(payload)}

${BRAND.name} · modulyconcept.pl
Masz pytanie? Odpowiedz na tego maila.`,
  };
}
