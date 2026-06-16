/** Zakładki CMS — układ jak w Lumine (bez powiązania z konkretnymi polami marki). */
export const cmsPages = [
  { id: "home", label: "Strona główna" },
  { id: "shop", label: "Sklep" },
  { id: "o-nas", label: "O nas" },
  { id: "kontakt", label: "Kontakt" },
  { id: "faq", label: "FAQ" },
] as const;

export type CmsPageId = (typeof cmsPages)[number]["id"];

export const cmsPartnerzyDemo = [
  { id: "p1", name: "Sabrija Store", description: "Z logotypem", hasLogo: true },
  { id: "p2", name: "Studio Nova", description: "Tylko tekst", hasLogo: false },
] as const;

export const cmsInstagramDemo = [
  { id: "ig1", order: 1 },
  { id: "ig2", order: 2 },
  { id: "ig3", order: 3 },
  { id: "ig4", order: 4 },
  { id: "ig5", order: 5 },
  { id: "ig6", order: 6 },
] as const;
