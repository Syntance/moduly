# Płatności — konfiguracja P24, Stripe, tpay

Moduly integruje trzy produkcyjne bramki płatności w Medusie oraz przelew manualny (system default). Priorytet wyboru providera jest zdefiniowany w **ADR 002**.

## Architektura

```
Checkout (storefront)
    └── @moduly/commerce/checkout.ts
            └── pickPreferredProvider(providers[])
                    └── initiatePaymentSession(cartId, providerId)
                            └── Medusa backend (apps/backend)
                                    ├── pp_przelewy24_przelewy24
                                    ├── pp_stripe_stripe
                                    ├── pp_tpay_tpay
                                    └── pp_system_default (przelew manual)
```

## Feature flags

Providery rejestrują się w `medusa-config.ts` **tylko gdy** flaga ENV = `1` **i** wymagane klucze są ustawione.

| Flaga | Provider | Wymagane ENV |
|-------|----------|--------------|
| `FEATURE_P24=1` | Przelewy24 | `PRZELEWY24_MERCHANT_ID`, `PRZELEWY24_POS_ID`, `PRZELEWY24_API_KEY`, `PRZELEWY24_CRC` |
| `FEATURE_STRIPE=1` | Stripe | `STRIPE_API_KEY`, opcjonalnie `STRIPE_WEBHOOK_SECRET` |
| `FEATURE_TPAY=1` | tpay | `TPAY_MERCHANT_ID`, `TPAY_API_PASSWORD`, `TPAY_SECURITY_CODE` |

Przelew bankowy (manual) jest zawsze dostępny jako `pp_system_default` — nie wymaga flagi.

### Przykład `.env` (backend)

```env
FEATURE_P24=1
FEATURE_STRIPE=1
FEATURE_TPAY=1

PRZELEWY24_MERCHANT_ID=
PRZELEWY24_POS_ID=
PRZELEWY24_API_KEY=
PRZELEWY24_CRC=
PRZELEWY24_SANDBOX=true

STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CAPTURE=true

TPAY_MERCHANT_ID=
TPAY_API_PASSWORD=
TPAY_SECURITY_CODE=
TPAY_SANDBOX=true
```

## ADR 002 — `pickPreferredProvider`

Funkcja w `@moduly/commerce/payments` wybiera domyślnego providera przy inicjacji płatności:

```
P24 → Stripe → tpay → przelew manual (pp_system_default) → pierwszy z listy
```

```ts
import { pickPreferredProvider, PRZELEWY24_PROVIDER_ID } from "@moduly/payments";

const providerId = pickPreferredProvider(cart.payment_providers);
// np. "pp_przelewy24_przelewy24" gdy P24 zarejestrowany i dostępny
```

### Dlaczego taka kolejność?

1. **P24** — dominująca metoda w PL, najwyższa konwersja checkoutu
2. **Stripe** — karty + Apple/Google Pay, fallback międzynarodowy
3. **tpay** — alternatywa BLIK/przelewy gdy P24 niedostępny
4. **Manual** — przelew tradycyjny, zawsze jako ostatnia opcja produkcyjna

Testy: `packages/payments/tests/pick-preferred-provider.test.ts`

## Bootstrap providerów

Skrypt idempotentny `ensure-moduly-payment` podpina providery do regionu sklepu:

```bash
pnpm --filter @moduly/backend exec medusa exec ./src/scripts/ensure-moduly-payment.ts
```

Logika (`apps/backend/src/lib/ensure-moduly-payment.ts`):

- Sprawdza `FEATURE_*` + klucze API
- Rejestruje tylko skonfigurowane providery
- Nie nadpisuje istniejących powiązań regionu

## Konfiguracja storefrontu

W `moduly.config.ts`:

```ts
payments: {
  enabled: [
    "pp_przelewy24_przelewy24",
    "pp_stripe_stripe",
    "pp_system_default",
  ],
  defaultProvider: "pp_przelewy24_przelewy24",
  bankTransfer: {
    recipientName: "Firma Sp. z o.o.",
    iban: "PL...",
    // ...
  },
}
```

`enabled` filtruje UI checkoutu; faktyczny provider sesji wybiera `pickPreferredProvider` z listy zwróconej przez Medusę.

## Webhooki i reconcile

| Provider | Webhook / reconcile |
|----------|---------------------|
| Stripe | `STRIPE_WEBHOOK_SECRET` — endpoint Medusa payment-stripe |
| tpay | Job `reconcile-tpay-payments` — polling statusów |
| P24 | Callback URL w panelu P24 → Medusa route |

## Sandbox vs produkcja

- `PRZELEWY24_SANDBOX=true` / `TPAY_SANDBOX=true` — środowiska testowe
- Stripe: klucze `sk_test_*` vs `sk_live_*`
- Po deploy: smoke test checkoutu w incognito (reguła 00-ecom-core)

## Publiczny fallback

Gdy storefront nie może zainicjować płatności, opcjonalny endpoint:

```
POST /store/custom/ensure-payment
```

Wyłącz: `MODULY_DISABLE_PUBLIC_ENSURE_PAYMENT=true` w produkcji jeśli niepotrzebny.

## Zobacz też

- [ADR 002](adr/002-payment-priority.md)
- [security.md](security.md) — sekrety i rate limiting
