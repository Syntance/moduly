# Instalacja i uruchomienie

Przewodnik po starterach Moduly i CLI `@syntance/moduly`.

## Wymagania

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL (lokalnie lub Neon/Supabase)
- Dla sklepu: Redis (lokalnie lub Upstash)

## Szybki start w monorepo

```bash
git clone https://github.com/Syntance/moduly.git
cd moduly
pnpm install

# Prototyp UI panelu (mock data, bez backendu) — http://localhost:3002/magazyn
pnpm dev:demo

# Strona CMS (Postgres)
pnpm dev:strona

# Sklep (storefront + Medusa backend) — http://localhost:3000
pnpm dev:sklep
```

### Panel demo (`apps/panel-demo`)

Wizualny prototyp panelu magazynu — do briefów, screenshotów i akceptacji UX przed wdrożeniem w starterach.

| | |
|--|--|
| Pakiet | `@moduly/panel-demo` |
| Port | **3002** |
| Trasa | `/magazyn` (bez prefiksu `/panel`) |
| Backend | brak — dane w `lib/data.ts` |
| Zrzuty | `apps/panel-demo/screenshots/` |

```bash
pnpm dev:demo
# lub
pnpm --filter @moduly/panel-demo dev
```

Pełna struktura monorepo i wszystkie skrypty root: [README.md](../README.md).

## Skrypty root (pnpm)

| Skrypt | Opis |
|--------|------|
| `pnpm dev` | Turbo — wszystkie appki z taskiem `dev` |
| `pnpm dev:demo` | Panel demo (:3002) |
| `pnpm dev:strona` | Starter CMS |
| `pnpm dev:sklep` | Starter sklep + Medusa backend |
| `pnpm build` | Build produkcyjny |
| `pnpm typecheck` | TypeScript w całym workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm clean` | Czyści `.next`, `.turbo`, `dist` |
| `pnpm format` | Prettier |

## Tworzenie nowego projektu (CLI)

CLI kopiuje gotowy starter do wskazanego katalogu.

```bash
# Strona informacyjna + CMS
pnpm dlx @syntance/moduly create strona --target ./moja-strona

# Sklep e-commerce
pnpm dlx @syntance/moduly create sklep --target ./moj-sklep
```

### Po utworzeniu projektu

```bash
cd moja-strona   # lub moj-sklep
pnpm install
cp .env.example .env.local
# Uzupełnij POSTGRES_URL, sekrety JWT, klucze API
pnpm dev
```

### Starter `strona`

| Element | Opis |
|---------|------|
| Storage | Postgres (Drizzle) via `PostgresStore` |
| Auth | `PostgresAuth` |
| Moduły | CMS, SEO/GEO, formularze, panel admina |
| Backend Medusa | Nie wymagany |

### Starter `sklep`

| Element | Opis |
|---------|------|
| Storage | Medusa Postgres + `MedusaStore` dla CMS |
| Auth | `MedusaAuth` (admin Medusa) |
| Moduły | Pełny magazyn, commerce, płatności |
| Backend | `apps/backend` — MedusaJS v2 |

## Dokładanie modułów do istniejącego projektu

```bash
moduly add cms --target ./moj-projekt
moduly add commerce --target ./moj-projekt
moduly add client-panel --target ./moj-projekt
```

CLI automatycznie:

1. Włącza moduły w `moduly.config.ts` (`modules.content: true`, itd.)
2. Dodaje pakiety do `transpilePackages` w `tsconfig.json`
3. Dopisuje zmienne do `.env.example`

### Vendoring (projekt poza monorepo)

Gdy projekt nie jest częścią workspace Moduly:

```bash
moduly add magazyn --target ../zewnetrzny-projekt --vendor
```

Źródła pakietów trafiają do `vendor/moduly/<pakiet>/`. Następnie skonfiguruj aliasy w `tsconfig.json` lub opublikuj pakiety `@moduly/*`.

## Pakiet `@moduly/legal-consent`

Baner cookies i strony prawne:

```tsx
// app/layout.tsx
import { ConsentProvider, CookieConsent } from "@moduly/legal-consent";

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <ConsentProvider siteName="Mój Sklep" privacyPolicyHref="/polityka-prywatnosci">
          {children}
          <CookieConsent />
        </ConsentProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/(shop)/regulamin/page.tsx
import {
  LegalPageTemplate,
  RegulaminTemplate,
  regulaminIntro,
} from "@moduly/legal-consent";

const config = {
  brandName: "Mój Sklep",
  contactEmail: "kontakt@example.com",
  siteUrl: "https://example.com",
};

export default function RegulaminPage() {
  return (
    <LegalPageTemplate
      brandName={config.brandName}
      title="Regulamin sklepu internetowego"
      intro={regulaminIntro(config)}
      breadcrumbs={[{ label: "Strona główna", href: "/" }, { label: "Regulamin" }]}
    >
      <RegulaminTemplate config={config} />
    </LegalPageTemplate>
  );
}
```

## Cursor rules (opcjonalnie)

```bash
pnpm dlx degit Syntance/cursor-rules/fundament .cursor/rules
pnpm dlx degit Syntance/cursor-rules/medusa .cursor/rules    # sklep
pnpm dlx degit Syntance/cursor-rules/magazyn .cursor/rules   # magazyn
```

## Weryfikacja przed wdrożeniem

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Sklep: dodatkowo pnpm test:e2e (checkout)
```

## Troubleshooting

| Problem | Rozwiązanie |
|---------|-------------|
| `Brak zarejestrowanego DataStore` | Wywołaj `setDataStore()` w `instrumentation.ts` lub server bootstrap |
| Starter nie istnieje | Użyj pełnego repo moduly; `apps/starter-*` musi być obecny |
| Moduł nie kompiluje | Sprawdź `transpilePackages` i `pnpm install` w workspace |
| Medusa 401 admin | Zweryfikuj `MEDUSA_BACKEND_URL` i `auth.provider: "medusa"` |

## Zobacz też

- [architecture.md](architecture.md)
- [payments.md](payments.md)
- [security.md](security.md)
