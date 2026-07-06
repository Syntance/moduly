# Blueprint `checkout-p24` — checkout Przelewy24 1:1 z produkcji

Komplet plików checkoutu P24 przeniesiony wprost z produkcji Lumine po
audycie niezawodności 06.07.2026 (ADR 007). Ten kod obsłużył realny incydent
podwójnej wpłaty i przeszedł suitę chaos e2e na żywym sklepie. **Nie edytuj
plików blueprintu ręcznie** — poprawki wprowadzaj w repo produkcyjnym i
synchronizuj: `node scripts/sync-checkout-blueprint.mjs`.

## Co dostajesz

**Backend (Medusa v2)** — `backend/` → `apps/backend/`:

- moduł płatności `przelewy24` (rejestracja transakcji na `session_id`
  Medusy, webhook z konwersją grosze→PLN, weryfikacja podpisu),
- `POST /store/custom/prepare-checkout` — dostawa + kolekcja + sesja w jednym
  roundtripie; dopłata express jako realna metoda wysyłki; reużycie sesji
  z guardem kwoty i guardem wpłaty-w-drodze (409 „nie płać ponownie");
  rate-limit Upstash,
- `cart-express`, `apply-promo-code`, `remove-promo-code` — WYŁĄCZNIE
  `query.graph` + twardy assert id (remoteQuery z linkiem `promotions.*`
  gubi filtr i zwraca cudzy koszyk — incydent 06.07.2026),
- `p24-return-status` (okno łaski 15 min dla pay-by-link — nigdy
  przedwczesnego „failed"), `p24-retry-payment` (przerejestrowanie z guardem),
- reconcile: job + endpoint + współdzielony rdzeń (`run-p24-reconcile`) —
  samonaprawa osieroconych koszyków, domknięcie płatności w tym samym
  przebiegu, idempotentne maile,
- testy vitest (7 plików — kwoty, sesje, guardy, webhook).

**Storefront (Next.js App Router)** — `storefront/` → `apps/<storefront>/`:

- `CartProvider` (guard cudzego koszyka, konwencja kwot przed rabatem,
  `shippingDiscount` → „Dostawa: gratis", autorytet `cart.total`),
- `CheckoutForm` (double-submit guard trzymany przez twardą nawigację,
  wymuszenie `retry=1` po powrocie z bramki — zużyty link P24),
- strony `checkout/przelewy24/start|return`, `checkout/p24/retry`
  (popup + fallback redirect, obsługa anulowania, pending zamiast failed),
- proxy `/api/medusa/[...path]` (dokleja publishable key),
- chaos e2e (`tests-e2e/checkout-chaos.e2e.spec.ts`): double-click = 1
  rejestracja; bogus cart_id → pending; offline → nigdy „failed";
  ponowne podejście → `retry=1`.

Stuby do podmiany przy podpinaniu analityki (`@moduly/analytics`):
`lib/analytics/{useAnalytics,track,traffic-source,upsell-attribution,
destinations/posthog,events/registry}.ts`.

## Instalacja

```bash
pnpm dlx @syntance/moduly blueprint checkout-p24 --target ./moj-sklep
# opcjonalnie: --storefront-dir apps/sklep  --backend-dir apps/backend  --force
```

Po skopiowaniu:

1. `pnpm install && pnpm typecheck` w projekcie docelowym.
2. Uzupełnij ENV (poniżej) w `.env` backendu i storefrontu.
3. Zarejestruj moduł `przelewy24` w `medusa-config.ts` projektu
   (wpis w `modules`, jak w `apps/backend/medusa-config.ts` startera).
4. Webhook w panelu P24: `https://<backend>/hooks/payment/przelewy24_przelewy24`
   (bez podwójnego prefiksu `pp_`!).
5. Cron reconcile: wywołuj `POST /store/custom/reconcile-p24` (Bearer
   `RECONCILE_CRON_SECRET`) co 15 min (Vercel cron / zewnętrzny scheduler);
   job wewnętrzny wymaga `MEDUSA_WORKER_MODE=shared`.

## ENV

| Klucz | Opis |
| --- | --- |
| `PRZELEWY24_MERCHANT_ID` | ID merchanta (przy prostym koncie = POS ID) |
| `PRZELEWY24_POS_ID` | POS ID (opcjonalnie; domyślnie MERCHANT_ID) |
| `PRZELEWY24_CRC` | klucz CRC (podpisy transakcji i webhooka) |
| `PRZELEWY24_API_KEY` | klucz API (pull statusu / verify) |
| `PRZELEWY24_SANDBOX` | `true` na sandboxie |
| `MEDUSA_BACKEND_URL` | publiczny URL backendu (urlStatus webhooka) |
| `STOREFRONT_URL` | publiczny URL sklepu (urlReturn) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | publishable key sklepu |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | rate-limit `prepare-checkout` (5/min/IP) |
| `RECONCILE_CRON_SECRET` | Bearer crona reconcile |
| `INTERNAL_EMAIL_SECRET` | wspólny sekret front↔back (maile transakcyjne) |
| `MEDUSA_WORKER_MODE` | `shared` — inaczej joby reconcile nie chodzą |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | (opc.) anty-bot |
| `SENTRY_DSN` | (zalecane) alerty: niezgodność kwot, cudzy koszyk, fee=0 |

## Smoke-testy po wdrożeniu (obowiązkowe)

```bash
# chaos e2e przeciwko środowisku (bezpieczne — nie domyka płatności)
PLAYWRIGHT_BASE_URL=https://twoj-sklep.pl npx playwright test tests-e2e/checkout-chaos.e2e.spec.ts
```

Ręcznie: 1 płatność BLIK w sandboxie → zamówienie „Opłacone" bez dotykania
strony powrotu (webhook!); reload `/checkout/przelewy24/start` → w panelu P24
nadal JEDNA transakcja; anulowanie na bramce → „Zapłać" otwiera ŚWIEŻĄ bramkę.

## Znane granice

- Stuby analytics są no-op — podepnij `@moduly/analytics` albo zostaw.
- Magazyn (panel) instalowany osobno (`moduly add magazyn`); parytet promocji
  „darmowa dostawa z regułą wykluczenia dopłaty express" wymaga magazynu w
  wersji ≥ synchronizacji 06.07.2026 (ADR 007, faza 2).
- `certificate-line-item` (konfigurator certyfikatów Lumine) celowo poza
  blueprintem — to funkcja produktowa, nie checkoutowa.
