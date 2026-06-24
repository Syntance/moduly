# Checkout — onboarding nowego sklepu

Jak postawić utwardzony checkout w nowym sklepie z `moduly`. Standard kontraktu: `cursor-rules/medusa/46-checkout-standards.mdc`. Decyzje: [ADR 006](./adr/006-checkout-hardening.md).

## Architektura — 5 torów domknięcia płatności

Stan „opłacone" ustawia WYŁĄCZNIE webhook + pull `transaction/verify`. Redirect z URL nigdy nie wystarcza. Zamówienie powstaje tylko po realnym potwierdzeniu środków.

1. **Return page** (`/checkout/<provider>/return`) — pull status → `completeCart` (polling z backoffem).
2. **Webhook** (`getWebhookActionAndData` w module) — podpis PRZED logiką → `verify` → aktualizacja sesji.
3. **Scheduled job** (`jobs/reconcile-<provider>-payments.ts`, `*/10`) — działa tylko w `MEDUSA_WORKER_MODE` shared/worker.
4. **Cron Vercel → endpoint** (`/api/cron/reconcile-payments` → `/store/custom/reconcile-<provider>`, `*/15`) — NIEZALEŻNY od trybu workera.
5. **Idempotencja + fallback** — reuse pending sesji + circuit breaker → przelew tradycyjny.

## Pliki (źródło prawdy)

| Warstwa | Plik |
| --- | --- |
| Sanityzacja | `packages/commerce/src/checkout/sanitize-order-notes.ts` |
| Reuse sesji | `packages/commerce/src/medusa/checkout.ts` → `findReusableRedirectUrl` |
| Formularz | `packages/commerce/src/components/checkout/CheckoutForm.tsx` (double-submit, slow-state, Turnstile gated) |
| Moduł bramki | `apps/backend/src/modules/<provider>/` |
| Reconcile rdzeń | `apps/backend/src/lib/run-<provider>-reconcile.ts` |
| Reconcile endpoint | `apps/backend/src/api/store/custom/reconcile-<provider>/route.ts` |
| Maile | `apps/backend/src/lib/{internal-auth,order-email-dispatch}.ts`, `subscribers/order-placed.ts`, `api/store/custom/notify-*` |
| Storefront flow | `apps/starter-sklep/app/(shop)/checkout/przelewy24/{start,return}`, `p24/retry`, `components/checkout/bank-transfer-instructions.tsx` |
| Cron / mail bridge | `apps/starter-sklep/app/api/cron/reconcile-payments`, `app/api/internal/order-email`, `vercel.json` |

## Manifest ENV

```bash
# Bramka (per provider, za flagą)
FEATURE_P24=1
P24_MERCHANT_ID=...   P24_POS_ID=...   P24_CRC=...   P24_API_KEY=...
# Anti-abuse (zawsze)
UPSTASH_REDIS_REST_URL=...   UPSTASH_REDIS_REST_TOKEN=...
# Reconcile / maile — TEN SAM sekret na backendzie i storefroncie (bez spacji)
CRON_SECRET=...
ORDER_EMAIL_INTERNAL_SECRET=...
STOREFRONT_URL=https://twoj-sklep.pl
# Worker — MUSI być shared
MEDUSA_WORKER_MODE=shared
# CAPTCHA — opcjonalnie, domyślnie OFF
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   TURNSTILE_SECRET_KEY=
```

## Webhook URL (panel bramki)

```
https://<backend>/hooks/payment/<provider_id>
# np. https://api.twoj-sklep.pl/hooks/payment/pp_przelewy24_przelewy24
```

## Railway / worker mode

`MEDUSA_WORKER_MODE=shared`. NIE `server` na pojedynczej instancji — wyłącza scheduled jobs (reconcile) i subscribery (`order.placed`) → sieroty + brak maili. Endpoint reconcile + cron Vercel są siatką bezpieczeństwa niezależną od trybu.

## Checklist deploy

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` zielone
- [ ] `MEDUSA_WORKER_MODE=shared` na Railway
- [ ] Webhook URL w panelu bramki
- [ ] `ORDER_EMAIL_INTERNAL_SECRET` identyczny na backendzie i storefroncie (bez whitespace)
- [ ] Cron Vercel `reconcile-payments` aktywny (co 15 min) + cron przekazuje `x-publishable-api-key`
- [ ] CSP (`next.config.ts`) zawiera domeny bramek + `challenges.cloudflare.com`
- [ ] Sentry `beforeSend` scrub PII + alerty (reconcile-recovered, webhook-sig-fail)
- [ ] Smoke sandbox: 1 płatność → webhook → order `captured`; reload `/start` = 1 transakcja; reconcile endpoint 200

## Częste bugi (i gdzie naprawione)

- „Płać" 2× → `submittingRef` w `CheckoutForm`.
- Reload crashującego checkoutu → wiele transakcji → SSR bez dompurify + reuse sesji.
- Webhook zginął → sierota → reconcile job + endpoint + cron.
- `server` mode → brak jobów/maili → cron Vercel + dispatch maili z endpointu reconcile.
- Fake webhook `?status=success` → signature check + alert.
