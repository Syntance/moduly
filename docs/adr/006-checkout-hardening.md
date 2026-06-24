# ADR 006: Utwardzenie checkoutu — idempotencja, self-healing reconcile, captcha za flagą

**Status:** Zaakceptowany
**Data:** 2026-06-24
**Kontekst:** Checkout to critical path. Incydenty produkcyjne (Lumine) ujawniły klasę bugów, które muszą być rozwiązane RAZ i powtarzalnie w każdym nowym sklepie z `moduly`. Standard kontraktu: `cursor-rules/medusa/46-checkout-standards.mdc`.

## Problem

1. **SSR crash** — `isomorphic-dompurify` w `CheckoutForm` ciągnie `jsdom` → na Vercel/Next 16/Turbopack wywala SSR `/checkout` (`ERR_REQUIRE_ESM`).
2. **Duplikaty transakcji** — `initPrzelewy24Redirect` zawsze rejestrował nową transakcję → reload `/start` / wieloklik tworzył wiele porzuconych sesji w panelu bramki.
3. **Sieroty** — gdy webhook zginął lub `MEDUSA_WORKER_MODE=server` (scheduled jobs nie chodzą na 1 instancji), opłacone koszyki nigdy się nie domykały (realny incydent 214,90 PLN).
4. **Brak maili dla odzyskanych** — subscriber `order.placed` też nie odpala w trybie `server`.

## Decyzja

- **Sanityzacja bez dompurify**: `packages/commerce/src/checkout/sanitize-order-notes.ts` (strip HTML regexem); backend re-sanityzuje (`lib/order-notes.ts`).
- **Idempotencja sesji**: `findReusableRedirectUrl(cart, providerId)` reużywa pending sesji z gotowym `redirect_url` zamiast rejestrować nową.
- **Self-healing reconcile w DWÓCH torach niezależnych od workera**:
  - wspólny rdzeń `lib/run-<provider>-reconcile.ts` (zwraca `recoveredOrderIds`),
  - scheduled job (`*/10`) + endpoint `POST /store/custom/reconcile-<provider>` (sekret `x-order-email-secret`) wołany przez cron Vercel (`*/15`),
  - endpoint dispatchuje maile dla odzyskanych (subscriber w `server` nie odpala).
- **Maile idempotentne**: flaga `email_sent_<type>` w metadata zamówienia (`lib/order-email-dispatch.ts`), wysyłka przez storefront `/api/internal/order-email` (Resend).
- **CAPTCHA Turnstile za flagą** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (domyślnie OFF); rate-limit Upstash zawsze ON.
- **Alerty Sentry**: distinct `captureMessage` dla reconcile-recovered (płatność cicho zginęła) i webhook-signature-fail.
- **Worker**: domyślnie `MEDUSA_WORKER_MODE=shared` (nie `server` na 1 instancji).

## Konsekwencje

- Każdy nowy sklep dostaje ten sam, odporny checkout — kopiuj z `moduly` wg `checkout-clone-playbook.mdc`.
- Reconcile działa nawet gdy worker/webhook zawiedzie (cron Vercel jest jedynym gwarantowanym torem).
- Dodanie nowej bramki = ten sam kontrakt adaptera (`46-checkout-standards.mdc` §2).
- Testy: `packages/commerce/tests/checkout-reuse.test.ts`, `apps/backend/src/lib/__tests__/reconcile.test.ts`, `e2e/tests/checkout.spec.ts`.

## Odrzucone alternatywy

1. **Tylko scheduled job** — pada w trybie `server`; cron Vercel + endpoint to siatka niezależna.
2. **Custom tabela `webhook_events`** — Medusa v2 ma wbudowaną deduplikację per `payment_session_id`.
3. **reCAPTCHA** — Google tracking/cookies/GDPR; Turnstile jest zero-cookie.
4. **Captcha zawsze ON** — koszt 10-20% konwersji; włączamy dopiero przy abuse.

## Powiązane

- [checkout-onboarding.md](../checkout-onboarding.md)
- `cursor-rules/medusa/46-checkout-standards.mdc`, `checkout-clone-playbook.mdc`
