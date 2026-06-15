# ADR 001: Podział storage — Medusa vs Postgres

**Status:** Zaakceptowany  
**Data:** 2026-06-15  
**Kontekst:** Moduly obsługuje dwa typy projektów — stronę CMS i pełny sklep.

## Problem

Gdzie przechowywać dane panelu (CMS, formularze, zwroty, ustawienia)? Czy wszystko powinno iść przez Medusę, czy wydzielić własną warstwę Postgres?

## Decyzja

Wprowadzamy abstrakcję **`DataStore`** z dwoma implementacjami:

| Starter | Implementacja | Baza |
|---------|---------------|------|
| `starter-strona` | `PostgresStore` | Własny Postgres (Drizzle) |
| `starter-sklep` | `MedusaStore` + moduły Medusa | Postgres Medusy |

### Co idzie do PostgresStore (bez Medusa)

- Treść CMS (strony, global, SEO)
- Formularze kontaktowe i zgłoszenia
- Zwroty/reklamacje (gdy bez backendu Medusa)
- Ustawienia witryny, audyt

### Co zostaje w Medusie

- Produkty, warianty, ceny, inventory
- Koszyki, zamówienia, płatności, fulfillment
- Klienci sklepu (store API)
- Moduły custom: `forms`, `returns` (sklep)

## Uzasadnienie

1. **Starter strona** nie powinien wymagać Medusy — niższy koszt hostingu i prostszy onboarding
2. **Jeden interfejs** (`DataStore`) — moduły magazynu (`@moduly/magazyn-content`, `magazyn-forms`) działają na obu backendach
3. **Medusa** jest źródłem prawdy dla commerce — duplikowanie zamówień w Drizzle byłoby błędem

## Konsekwencje

### Pozytywne

- Prostszy deploy strony informacyjnej (jedna baza, jeden serwis)
- Testowalność — `PostgresStore` bez mocków Medusa API
- Migracja lumineconcept → moduly: wzorzec już sprawdzony

### Negatywne

- Dwa schematy DB do utrzymania (Drizzle migrations + Medusa migrations)
- Przy `starter-sklep` część danych w module services, część w storefront metadata — wymaga dokumentacji

## Implementacja

```ts
// starter-strona
import { PostgresStore, setDataStore } from "@moduly/data-store";
setDataStore(new PostgresStore(db));

// starter-sklep
import { MedusaStore, setDataStore } from "@moduly/data-store";
setDataStore(new MedusaStore({ backendUrl, adminToken }));
```

## Powiązane

- [architecture.md](../architecture.md)
- [ADR 003](003-auth-provider.md) — auth podąża za tym samym podziałem
