# moduly

System instalacyjny **CMS + Magazyn + Commerce** dla projektów Syntance.

Monorepo (**pnpm** + **Turborepo**): gotowe startery Next.js 16, współdzielone pakiety `@moduly/*`, prototyp UI panelu oraz CLI do dokładania modułów w projektach klientów.

---

## Struktura monorepo

```
moduly/
├── apps/
│   ├── panel-demo/          @moduly/panel-demo      — prototyp UI panelu (mock, :3002)
│   ├── starter-sklep/       @moduly/starter-sklep   — sklep + panel /magazyn/panel (:3000)
│   ├── starter-strona/      @moduly/starter-strona  — CMS bez commerce
│   └── backend/             MedusaJS v2             — API sklepu (:9000)
│
├── packages/
│   ├── types/               Współdzielone typy (DataStore, AuthProvider…)
│   ├── config/              ModulyConfig, defaults
│   ├── data-store/          PostgresStore, MedusaStore
│   ├── auth-core/           MedusaAuth, PostgresAuth, OTP klienta
│   ├── cms/                 Parser CMS, metadata, revalidacja
│   ├── commerce/            Koszyk, checkout, Meilisearch
│   ├── payments/            Przelewy24, Stripe, tpay, przelew
│   ├── seo-geo/             SEO per strona
│   ├── ui/                  Chrome panelu, sidebar, theme.css
│   ├── client-panel/        Panel klienta (konto, zwroty OTP)
│   ├── legal-consent/       Baner cookies, zgody RODO
│   └── magazyn-*/           Moduły panelu administracyjnego
│       ├── magazyn-core/        Sesja admina, env, klient Medusa
│       ├── magazyn-analytics/   Statystyki: sprzedaż + GA4/PostHog
│       ├── magazyn-orders/      Zamówienia
│       ├── magazyn-products/    Produkty
│       ├── magazyn-categories/  Kategorie
│       ├── magazyn-content/     CMS w panelu
│       ├── magazyn-emails/      Maile transakcyjne
│       ├── magazyn-forms/       Formularze + skrzynka
│       └── magazyn-returns/     Zwroty i reklamacje
│
├── cli/                     @syntance/moduly — create / add
├── e2e/                     Playwright (testy E2E)
├── docs/                    Dokumentacja + ADR
├── scripts/                 Skrypty pomocnicze
├── package.json             Skrypty root (turbo)
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Aplikacje

| App | Pakiet | Port | URL panelu | Backend |
|-----|--------|------|------------|---------|
| **Panel demo** | `@moduly/panel-demo` | **3002** | `/magazyn` | brak (mock data) |
| **Starter sklep** | `@moduly/starter-sklep` | 3000 | `/magazyn/panel` | Medusa + Postgres |
| **Starter strona** | `@moduly/starter-strona` | 3000 | `/magazyn/panel` | Postgres (CMS) |
| **Backend** | `apps/backend` | 9000 | — | Medusa API |

**Panel demo** — wizualny prototyp (Lumine / Outdoor Store): dashboard, moduły, statystyki sprzedażowe + analityka GA4/PostHog (dane przykładowe), zrzuty w `apps/panel-demo/screenshots/`.

**Startery produkcyjne** — używają `@moduly/ui` + pakietów `magazyn-*`; panel demo ma własne komponenty UI i służy do briefów / screenshotów.

---

## Skrypty (root)

Uruchamiaj z katalogu głównego repozytorium:

| Skrypt | Opis |
|--------|------|
| `pnpm install` | Instalacja zależności workspace |
| `pnpm dev` | Turbo dev — wszystkie appki z taskiem `dev` |
| `pnpm dev:demo` | **Panel demo** → http://localhost:3002/magazyn |
| `pnpm dev:strona` | Starter CMS (Postgres) |
| `pnpm dev:sklep` | Starter sklep + backend Medusa |
| `pnpm build` | Build produkcyjny (turbo) |
| `pnpm typecheck` | TypeScript we wszystkich pakietach |
| `pnpm lint` | ESLint (turbo) |
| `pnpm test` | Vitest (turbo) |
| `pnpm test:e2e` | Playwright (`e2e/`) |
| `pnpm clean` | Czyści `.next`, `.turbo`, `dist` |
| `pnpm format` | Prettier na całym repo |

### Skrypty per aplikacja

```bash
pnpm --filter @moduly/panel-demo dev
pnpm --filter @moduly/starter-sklep dev
pnpm --filter @moduly/starter-strona dev
pnpm --filter @moduly/backend dev
```

---

## Szybki start

```bash
git clone https://github.com/Syntance/moduly.git
cd moduly
pnpm install

# Prototyp panelu (mock, bez backendu)
pnpm dev:demo

# Strona CMS
pnpm dev:strona

# Sklep + Medusa
pnpm dev:sklep
```

Po `dev:sklep` uzupełnij `.env.local` w `apps/starter-sklep` i `apps/backend` — patrz `apps/starter-sklep/.env.example`.

---

## Pakiety instalacyjne (CLI)

| Starter | Zawartość | Storage |
|---------|-----------|---------|
| `strona` | CMS + SEO/GEO + formularze + panel | Postgres (Drizzle) |
| `sklep` | Pełny sklep + Medusa + magazyn + płatności | Medusa Postgres |

```bash
pnpm dlx @syntance/moduly create strona --target ./moja-strona
pnpm dlx @syntance/moduly create sklep --target ./moj-sklep
pnpm dlx @syntance/moduly add cms --target ./moj-projekt
```

---

## Moduły funkcjonalne

- **magazyn** — panel administracyjny (produkty, zamówienia, kategorie, CMS, maile, ustawienia, statystyki)
- **forms** — formularze + skrzynka zgłoszeń
- **returns** — zwroty i reklamacje + panel klienta (OTP)
- **commerce** — koszyk, checkout, PLP/PDP, Meilisearch
- **payments** — Przelewy24, Stripe, tpay (+ przelew manual)
- **legal-consent** — baner cookies, `ConsentProvider`, strony prawne (RODO)
- **analytics** — dashboard GA4 + PostHog w `/panel/statystyki` (demo lub live API)

---

## Cursor rules

```bash
pnpm dlx degit Syntance/cursor-rules/fundament .cursor/rules
pnpm dlx degit Syntance/cursor-rules/medusa .cursor/rules    # sklep
pnpm dlx degit Syntance/cursor-rules/magazyn .cursor/rules   # magazyn
```

---

## Dokumentacja

| Plik | Temat |
|------|--------|
| [docs/architecture.md](docs/architecture.md) | Architektura, DataStore, Auth |
| [docs/installation.md](docs/installation.md) | Instalacja, ENV, troubleshooting |
| [docs/payments.md](docs/payments.md) | Płatności PL/EU |
| [docs/security.md](docs/security.md) | Bezpieczeństwo, CSP, sekrety |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [apps/panel-demo/README.md](apps/panel-demo/README.md) | Panel demo — zakres i uruchomienie |

---

## Źródła referencyjne

- [lumineconcept](https://github.com/Syntance/lumineconcept) — magazyn, CMS, commerce
- [sklep-retrohouse.pl](https://github.com/Syntance/sklep-retrohouse.pl) — formularze, zwroty, panel klienta
- [cursor-rules](https://github.com/Syntance/cursor-rules) — reguły Cursor
