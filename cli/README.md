# @syntance/moduly CLI

Narzędzie wiersza poleceń do tworzenia projektów **Moduly** i dokładania modułów do istniejących aplikacji Next.js.

## Instalacja

```bash
# Jednorazowo (bez globalnej instalacji)
pnpm dlx @syntance/moduly <komenda>

# Z monorepo moduly (dev)
pnpm --filter @syntance/moduly build
node cli/dist/index.js create strona --target ./moj-projekt
```

## Komendy

### `create` — nowy projekt ze startera

Kopiuje szablon z `apps/starter-strona` lub `apps/starter-sklep` do wskazanego katalogu.

```bash
moduly create strona --target ./moja-strona
moduly create sklep --target ./moj-sklep
```

| Starter | Zawartość |
|---------|-----------|
| `strona` | CMS + SEO/GEO + formularze + panel admina (Postgres) |
| `sklep` | Pełny sklep + Medusa + magazyn + płatności |

### `add` — moduł do istniejącego projektu

Dokłada moduł przez:

1. **Vendoring** (opcjonalnie `--vendor`) — kopiuje źródła pakietów do `vendor/moduly/`
2. **Patch `moduly.config.ts`** — włącza odpowiednie `modules.*`
3. **Patch `tsconfig.json`** — dodaje pakiety do `transpilePackages`
4. **Patch `.env.example`** — dopisuje wymagane zmienne ENV

```bash
moduly add cms --target ./moj-projekt
moduly add magazyn --target ./moj-projekt
moduly add forms --target ./moj-projekt
moduly add returns --target ./moj-projekt
moduly add client-panel --target ./moj-projekt
moduly add commerce --target ./moj-projekt

# Projekt poza monorepo — skopiuj źródła pakietów lokalnie
moduly add commerce --target ../zewnetrzny-sklep --vendor
```

### Dostępne moduły

| Moduł | Pakiety workspace | `moduly.config` |
|-------|-------------------|-----------------|
| `cms` | `@moduly/cms`, `@moduly/seo-geo`, `@moduly/data-store` | `content` |
| `magazyn` | `@moduly/magazyn-*`, `@moduly/auth-core`, `@moduly/ui` | orders, products, categories, content, emails, settings |
| `forms` | `@moduly/magazyn-forms` | `forms` |
| `returns` | `@moduly/magazyn-returns` | `returns` |
| `client-panel` | `@moduly/client-panel` | `returns`, `forms` |
| `commerce` | `@moduly/commerce`, `@moduly/payments` | orders, products |

## Wymagania

- Node.js ≥ 20
- Pełne repozytorium [Syntance/moduly](https://github.com/Syntance/moduly) (szablony w `apps/starter-*`)

## Dokumentacja

- [docs/installation.md](../docs/installation.md)
- [docs/architecture.md](../docs/architecture.md)
