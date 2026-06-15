# Moduł CMS + SEO (Magazyn)

Jeden panel do zarządzania treściami witryny, SEO i FAQ produktów — bez zewnętrznego CMS.

## Włączenie (nowy sklep)

1. W [`magazyn.config.ts`](../magazyn.config.ts):
   - `modules.content: true`
   - `content.pages` — lista podstron z blokami treści
   - `content.globalBlocks` — bloki globalne (Instagram, logotypy, trust bar…)

2. Trasy panelu (już dodane w Lumine):
   - `/magazyn/panel/cms` — treści CMS
   - `/magazyn/panel/ustawienia/seo` — SEO globalne i per podstrona

3. ENV storefrontu (odczyt treści):
   - `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD` — konto serwisowe do cache'owanego odczytu `Store.metadata`

4. ENV Medusa (obrazy):
   - `S3_*` / R2 — uploady z panelu trafiają na CDN
   - **Storefront (Vercel):** `S3_FILE_URL` + `NEXT_PUBLIC_S3_FILE_URL` (ta sama publiczna baza R2) — `remotePatterns` i CSP przy buildzie

## Przechowywanie danych

| Klucz `Store.metadata` | Zawartość |
|------------------------|-----------|
| `magazyn_site_settings` | Ustawienia witryny, globalne SEO, trust bar, checkout callout |
| `magazyn_page_seo` | SEO per podstrona |
| `magazyn_page_content` | Treści per podstrona (hero, FAQ, opinie, galerie…) |
| `magazyn_global_content` | Logotypy salonów, kafelki Instagram |

Produkty: `product.metadata.seo_*`, `product.metadata.product_faq`.

## Wydajność (hybrid CMS)

- **Tekst / SEO:** live z Medusa — jeden cache'owany fetch na render (`admin-read.ts`, tag
  `magazyn-content`, ISR 3600s). Po zapisie: `revalidateTag` + webhook (sekundy do prod).
- **Obrazy:** prebuild sync → `/public/images/cms/` + mapa URL (`static-cms-media-map.ts`).
  **Redeploy ręczny** z panelu CMS/SEO (`triggerCmsRedeployAction`) — ok. 2–3 min. Szczegóły: [`docs/CMS_STATIC_SYNC.md`](../../../docs/CMS_STATIC_SYNC.md).
- PDP: SEO i FAQ z już pobranego produktu — zero dodatkowych requestów.

## Migracja z Sanity

```bash
cd apps/storefront
pnpm exec tsx scripts/migrate-sanity-to-medusa.ts --dry-run
pnpm exec tsx scripts/migrate-sanity-to-medusa.ts
```

Wymaga `SANITY_API_TOKEN` i credentials Medusa w `.env.local`.

## Testy

```bash
pnpm test tests/lib/content/parsers.test.ts
pnpm type-check && pnpm lint && pnpm build
```
