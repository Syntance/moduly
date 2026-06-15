# moduly

System instalacyjny **CMS + Magazyn + Commerce** dla projektów Syntance.

Dwa gotowe pakiety instalacyjne (startery Next.js 16) + współdzielone pakiety workspace + CLI do dokładania modułów do istniejących projektów.

## Pakiety instalacyjne

| Starter | Zawartość | Storage |
|---------|-----------|---------|
| `apps/starter-strona` | CMS + SEO/GEO + formularze + panel admina | Postgres (Drizzle) |
| `apps/starter-sklep` | Pełny sklep + Medusa + magazyn + płatności | Medusa Postgres |

## Moduły

- **magazyn** — panel administracyjny (produkty, zamówienia, kategorie, CMS, maile, ustawienia)
- **forms** — zarządzanie formularzami + skrzynka zgłoszeń
- **returns** — zwroty i reklamacje + panel klienta (OTP)
- **commerce** — koszyk, checkout, PLP/PDP, Meilisearch
- **payments** — Przelewy24, Stripe, tpay (+ przelew manual)
- **legal-consent** — baner cookies, `ConsentProvider`, szablony stron prawnych (RODO)

## Szybki start

```bash
pnpm install
pnpm dev:strona   # starter strony CMS
pnpm dev:sklep    # starter sklepu
```

## CLI

```bash
pnpm dlx @syntance/moduly create strona
pnpm dlx @syntance/moduly create sklep
pnpm dlx @syntance/moduly add cms --target ./moj-projekt
```

## Cursor rules

```bash
pnpm dlx degit Syntance/cursor-rules/fundament .cursor/rules
pnpm dlx degit Syntance/cursor-rules/medusa .cursor/rules    # sklep
pnpm dlx degit Syntance/cursor-rules/magazyn .cursor/rules   # magazyn
```

## Dokumentacja

- [docs/architecture.md](docs/architecture.md)
- [docs/installation.md](docs/installation.md)
- [docs/payments.md](docs/payments.md)
- [docs/security.md](docs/security.md)
- [docs/adr/](docs/adr/) — Architecture Decision Records

## Źródła referencyjne

- [lumineconcept](https://github.com/Syntance/lumineconcept) — magazyn, CMS, commerce
- [sklep-retrohouse.pl](https://github.com/Syntance/sklep-retrohouse.pl) — formularze, zwroty, panel klienta
- [cursor-rules](https://github.com/Syntance/cursor-rules) — reguły Cursor
