import type { ModulyConfig } from "@moduly/config";

/**
 * Konfiguracja instancji Moduly — CMS + formularze + panel admina (bez commerce).
 * Sekrety trzymaj w `.env.local` — patrz `.env.example`.
 */
export const modulyConfig: ModulyConfig = {
  basePath: "/magazyn",

  branding: {
    name: "Przykładowa Strona",
    panelTitle: "Panel CMS",
    storefrontUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  },

  auth: {
    cookieName: "moduly_admin_session",
    google: false,
    provider: "postgres",
  },

  modules: {
    orders: false,
    products: false,
    categories: false,
    content: true,
    emails: true,
    settings: true,
    forms: true,
    returns: false,
  },

  content: {
    pages: [
      {
        id: "home",
        label: "Strona główna",
        path: "/",
        blocks: ["hero", "brandingCta"],
      },
      {
        id: "kontakt",
        label: "Kontakt",
        path: "/kontakt",
        blocks: ["hero", "faq"],
      },
    ],
    globalBlocks: ["announcementBar", "trustBar", "socialLinks", "footerText"],
  },

  payments: {
    enabled: [],
    defaultProvider: "pp_system_default",
    bankTransfer: {
      recipientName: "Przykładowa Firma Sp. z o.o.",
      iban: "PL00000000000000000000000000",
      swift: "EXAMPLEPL",
      addressLine1: "ul. Przykładowa 1",
      addressLine2: "00-001 Warszawa",
      paymentDays: 7,
      transferTitlePrefix: "Zamówienie",
    },
  },

  commerce: {
    search: { enabled: false },
    currency: "pln",
    locale: "pl-PL",
  },

  email: {
    fromName: "Przykładowa Strona",
    contactEmail: "kontakt@example.com",
    footerText: "Przykładowa Strona · Wszystkie prawa zastrzeżone",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  },

  emailTheme: {
    bg: "#f4f4f5",
    contentBg: "#ffffff",
    text: "#3f3f46",
    heading: "#18181b",
    accent: "#2563eb",
    muted: "#71717a",
    link: "#2563eb",
    fontKey: "sans",
    headerFontKey: "serif",
    contentWidth: 600,
    radius: 8,
    headerBg: "#18181b",
    headerText: "#fafafa",
    headerEyebrow: "",
    brandName: "Przykładowa Strona",
  },
};
