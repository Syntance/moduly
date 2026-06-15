# ADR 002: Priorytet providerów płatności — `pickPreferredProvider`

**Status:** Zaakceptowany  
**Data:** 2026-06-15  
**Kontekst:** Sklep obsługuje P24, Stripe, tpay i przelew manual. Checkout musi deterministycznie wybrać provider bez interakcji użytkownika (domyślna metoda).

## Problem

Medusa zwraca listę `payment_providers` dostępnych dla regionu. Kolejność z API nie gwarantuje preferencji biznesowej (konwersja PL → P24 first).

## Decyzja

Funkcja `pickPreferredProvider()` w `@moduly/commerce/payments`:

```ts
const PRODUCTION_PAYMENT_PROVIDER_IDS = [
  "pp_przelewy24_przelewy24",  // 1
  "pp_stripe_stripe",          // 2
  "pp_tpay_tpay",              // 3
] as const;

// Fallback: pp_system_default (przelew manual)
// Ostateczny fallback: list[0]
```

Algorytm:

1. Iteruj `PRODUCTION_PAYMENT_PROVIDER_IDS` w kolejności
2. Zwróć pierwszy ID obecny w liście dostępnych providerów
3. Jeśli brak — `pp_system_default`
4. Jeśli brak — pierwszy element listy

## Uzasadnienie

| Provider | Priorytet | Powód |
|----------|-----------|-------|
| P24 | 1 | Dominacja BLIK/przelewy w PL, najwyższa konwersja |
| Stripe | 2 | Karty, portfele — fallback i klient zagraniczny |
| tpay | 3 | Alternatywa gdy P24 wyłączony (`FEATURE_P24=0`) |
| Manual | 4 | Zawsze dostępny, nie wymaga bramki |

Feature flags (`FEATURE_P24`, `FEATURE_STRIPE`, `FEATURE_TPAY`) kontrolują **rejestrację** w Medusie, nie kolejność — kolejność jest stała w kodzie.

## Konsekwencje

- Checkout nie wymaga UI wyboru metody przy pierwszym wejściu (szybsza konwersja)
- Zmiana priorytetu = zmiana kodu + ADR (nie ENV)
- Testy jednostkowe w `packages/payments/tests/pick-preferred-provider.test.ts`

## Odrzucone alternatywy

1. **ENV `PAYMENT_PRIORITY=p24,stripe`** — zbyt łatwo o błąd konfiguracji w prod
2. **Sortowanie alfabetyczne z API** — nieodpowiednie dla PL
3. **Jeden provider** — ogranicza klientów bez karty/BLIK

## Powiązane

- [payments.md](../payments.md)
- `apps/backend/medusa-config.ts` — rejestracja modułów płatności
