# ADR 004: Audyt — podejście „composer” vs Moduly

**Status:** Zaakceptowany  
**Data:** 2026-06-15  
**Kontekst:** Przed powstaniem repozytorium `moduly` rozważano narzędzie typu **composer** — generator sklepu składający moduły z szablonów podobnie do `create-react-app` + pluginy.

## Czym był „composer” (podejście odrzucone)

Założenia wczesnej wersji:

- Jeden CLI generujący cały projekt z manifestu YAML (`composer.yaml`)
- Moduły jako **git submodules** lub tarball releases
- Konfiguracja przez szablony Handlebars w monolicie
- Brak współdzielonego workspace — każdy projekt kopia pełnego kodu
- Wersjonowanie modułów niezależne per release composer

### Problemy composer

| Problem | Skutek |
|---------|--------|
| Kopiowanie całego kodu per projekt | Drift — poprawki nie wracają do źródła |
| Submodules | UX deweloperski (git submodule update), CI complexity |
| Handlebars w config | Brak typów, trudne refaktoryzacje |
| Osobne repo per moduł | 8+ repozytoriów do synchronizacji |
| Brak `DataStore` | Każdy moduł bezpośrednio do Medusa API |

## Co zmieniło Moduly

| Aspekt | Composer (stare) | Moduly (obecne) |
|--------|------------------|-----------------|
| Struktura | Wygenerowany monolit | pnpm workspace + pakiety `@moduly/*` |
| CLI | Generuje wszystko od zera | `create` (starter) + `add` (patch istniejącego) |
| Config | YAML / Handlebars | Typowany `moduly.config.ts` |
| Storage | Bezpośrednio Medusa | `DataStore` abstrakcja (ADR 001) |
| Auth | Hardcoded Medusa admin | `AuthProvider` (ADR 003) |
| Płatności | Pierwszy z listy API | `pickPreferredProvider` (ADR 002) |
| Źródło prawdy | composer registry | Monorepo + lumineconcept jako referencja |
| Vendoring | Jedyny model | Opcjonalny `--vendor` w CLI `add` |

## Kluczowe decyzje migracyjne

1. **Workspace zamiast kopiowania** — `packages/*` importowane przez `workspace:*`; poprawka w jednym miejscu
2. **Dwa startery** zamiast N permutacji — `strona` i `sklep`; reszta przez `moduly add`
3. **Port z lumineconcept** — magazyn, CMS, commerce jako pakiety, nie nowe implementacje
4. **CLI minimalistyczny** — Commander + patch plików, nie pełny silnik szablonów
5. **ADR jako dokumentacja decyzji** — composer nie zostawił śladu dlaczego

## Co zachowaliśmy z composera

- Idea **modułów opcjonalnych** (`cms`, `magazyn`, `forms`, `returns`, `commerce`)
- **Feature flags** ENV dla integracji zewnętrznych
- **Cursor rules** jako osobne repo (`Syntance/cursor-rules`)
- **Degen templates** — `degit` dla reguł, nie dla całego sklepu

## Konsekwencje

- Jedno repo do clone — wyższy próg wejścia niż `npx create-x`
- Zysk: spójność typów, testy cross-package, turbo cache
- Projekty zewnętrzne mogą użyć `--vendor` lub publikacji npm `@moduly/*`

## Rekomendacja

Nowe projekty Syntance: **Moduly monorepo** lub `moduly create` + `add`.  
Podejście composer — **nie rozwijać**; historyczne manifesty (jeśli istnieją) traktować jako deprecated.

## Powiązane

- [architecture.md](../architecture.md)
- [installation.md](../installation.md)
- Źródło referencyjne: [lumineconcept](https://github.com/Syntance/lumineconcept)
