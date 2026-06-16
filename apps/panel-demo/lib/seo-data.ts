/** Dane demo SEO — układ jak w Lumine. */

export type SeoMeta = {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
};

export type SiteSettings = {
  title: string;
  description: string;
  titleTemplate?: string;
  googleSiteVerification?: string;
  defaultOgImageUrl?: string;
  seo?: SeoMeta;
};

export type SeoPageConfig = {
  id: string;
  label: string;
  path: string;
};

export const seoPages: SeoPageConfig[] = [
  { id: "home", label: "Strona główna", path: "/" },
  { id: "shop", label: "Sklep", path: "/sklep" },
  { id: "o-nas", label: "O nas", path: "/o-nas" },
  { id: "kontakt", label: "Kontakt", path: "/kontakt" },
  { id: "faq", label: "FAQ", path: "/faq" },
];

export const defaultSiteSettings: SiteSettings = {
  title: "Outdoor Store",
  description:
    "Sklep z odzieżą i sprzętem outdoorowym — kurtki, buty trekkingowe, plecaki i akcesoria na każdą wyprawę.",
  titleTemplate: "%s | Outdoor Store",
  googleSiteVerification: "",
  defaultOgImageUrl: "",
  seo: {
    metaTitle: "Outdoor Store — odzież i sprzęt outdoorowy",
    metaDescription:
      "Odkryj kurtki, buty trekkingowe i plecaki od sprawdzonych marek. Darmowa dostawa od 199 zł.",
    ogTitle: "Outdoor Store — wyprawa zaczyna się tutaj",
    ogDescription: "Odzież i sprzęt outdoorowy dla pasjonatów gór, lasów i szlaków.",
    ogImageUrl: "",
    canonicalUrl: "",
    noIndex: false,
    noFollow: false,
  },
};

export const defaultPageSeo: Record<string, SeoMeta> = {
  home: {
    metaTitle: "Outdoor Store — sklep trekkingowy online",
    metaDescription:
      "Kurtki zimowe, buty Alpin, plecaki i akcesoria outdoor. Sprawdzone marki, szybka wysyłka.",
    ogTitle: "Outdoor Store — wyprawa zaczyna się tutaj",
    ogDescription: "Odzież i sprzęt outdoorowy dla pasjonatów gór, lasów i szlaków.",
  },
  shop: {
    metaTitle: "Sklep — Outdoor Store",
    metaDescription: "Przeglądaj kategorie: odzież, obuwie, akcesoria i sprzęt sportowy.",
    ogTitle: "Sklep Outdoor Store",
    ogDescription: "Setki produktów na każdą pogodę i teren.",
  },
  "o-nas": {
    metaTitle: "O nas — Outdoor Store",
    metaDescription: "Od 2015 dostarczamy sprzęt outdoorowy. Poznaj naszą historię i zespół.",
  },
  kontakt: {
    metaTitle: "Kontakt — Outdoor Store",
    metaDescription: "Napisz do nas — odpowiadamy w ciągu 24 h w dni robocze.",
  },
  faq: {
    metaTitle: "FAQ — Outdoor Store",
    metaDescription: "Zwroty, dostawa, płatności i rozmiary — odpowiedzi na najczęstsze pytania.",
  },
};

export function getSeoPageById(id: string): SeoPageConfig | undefined {
  return seoPages.find((p) => p.id === id);
}
