# ADR 007 — Blueprinty instalacyjne: checkout P24 1:1 z produkcji (Lumine)

Data: 2026-07-06 · Status: przyjęte · Zastępuje częściowo podejście z ADR 006

## Kontekst

06.07.2026 checkout Lumine przeszedł pełny audyt niezawodności po realnym
incydencie podwójnej wpłaty (2× 224,80 zł). Znalezione i naprawione zostały
23+ defekty klasy produkcyjnej, m.in.:

- webhook P24: URL `pp_pp_`, korelacja po `session_id` Medusy, kwoty grosze→PLN,
- reconcile: filtr po realnej kolumnie `payment_collection.status`, domknięcie
  płatności w tym samym przebiegu, okno łaski 15 min dla pay-by-link,
- `remoteQueryObjectFromString` GUBIĄCY filtr `id` przy polach z linkiem
  cross-module (`promotions.*`) → zwracany CUDZY koszyk (wyciek danych);
  jedyna bezpieczna ścieżka: `query.graph` + twardy assert id,
- dopłata express jako REALNA metoda wysyłki (kwota pokazana = pobrana przez
  P24), rekoncyliowana idempotentnie w `prepare-checkout` i `cart-express`,
- promocja darmowej dostawy z target-regułą wykluczającą metodę-dopłatę,
- reużycie sesji P24 z guardem kwoty i guardem wpłaty-w-drodze (409 „nie płać
  ponownie"), wymuszany `retry=1` po powrocie z bramki (zużyty link),
- double-submit guard trzymający blokadę przez twardą nawigację,
- konwencja podsumowania: wiersze przed rabatem + jedna „Zniżka" /
  „Dostawa: gratis", suma wyłącznie z autorytatywnego `cart.total`,
- chaos e2e na żywej produkcji (double-click=1 rejestracja, bogus cart_id →
  pending, offline → nigdy „failed", retry=1 po anulowaniu).

Starter `starter-sklep` ma starszą generację tego kodu (commit f37f8c9),
strukturalnie rozjechaną z Lumine (logika w `@moduly/commerce` vs app-level).
Ręczne scalanie przy każdej poprawce w Lumine nie skaluje się.

## Decyzja

1. **Nowa warstwa `blueprints/`** w repo — komplety plików 1:1 z produkcji,
   zdebrandowane (`lumine` → `moduly`), z manifestem ścieżek docelowych:

   ```
   blueprints/
     checkout-p24/
       MANIFEST.json      # mapa plik → ścieżka docelowa + wymagane ENV
       README.md          # instalacja, klucze, smoke-testy
       backend/...        # moduł przelewy24, routes, liby, joby, testy
       storefront/...     # CartProvider, checkout, strony P24, e2e chaos
   ```

2. **Źródłem prawdy jest produkcja (Lumine)**. Skrypt
   `scripts/sync-checkout-blueprint.mjs` kopiuje listę plików z repo Lumine,
   wykonując deterministyczne transformacje (rename brandu, mapowanie
   importów `@lumine/types`/`@magazyn/*` na lokalne pliki blueprintu,
   stuby analytics). Po każdej rundzie poprawek w Lumine: `node scripts/
   sync-checkout-blueprint.mjs && git diff` — świadomy re-sync zamiast dryfu.

3. **Instalacja przez CLI**: `moduly add checkout-p24 --target ./projekt`
   kopiuje pliki wg MANIFEST-u i wypisuje brakujące ENV. `moduly create sklep`
   dostaje blueprint wgrany od razu. Starter-sklep zostanie zmigrowany NA
   blueprint (faza 2) — do tego czasu blueprint i starter współistnieją,
   a blueprint jest jedynym źródłem dla nowych projektów.

4. **Sklep = checkout P24 + magazyn + CMS out-of-the-box; strona = CMS.**
   Magazyn w nowych projektach ma wygląd i układ 1:1 z Lumine; motyw
   (paleta OKLCH, fonty) podpinany per projekt przez tokeny w
   `packages/config` (faza 2: `theme.css` + `magazyn.config`).

## Konsekwencje

- (+) Nowy sklep dostaje od pierwszego dnia checkout o niezawodności
  zweryfikowanej realnym pieniądzem i suitą chaos e2e.
- (+) Poprawki produkcyjne przenoszą się jednym skryptem, diff jest jawny.
- (+) ZROBIONE (faza 2b): starter-sklep ZMIGROWANY na blueprint — stare
  komponenty checkoutu usunięte, blueprint wgrany do apps/backend i
  apps/starter-sklep (idempotentnie), stary provider koszyka (drawer/PDP)
  współistnieje z blueprintowym na wspólnym `moduly_cart_id`.
- (+) ZROBIONE (faza 3): `scripts/verify-blueprint.mjs` — wgrywa blueprint
  do starterów i odpala `tsc` obu aplikacji; zielony przebieg = blueprint
  instalowalny. Odpalaj w CI po zmianach w blueprints/ lub starterach.

## Wymagane ENV (manifest skrócony)

`PRZELEWY24_MERCHANT_ID/POS_ID`, `PRZELEWY24_CRC`, `PRZELEWY24_API_KEY`,
`PRZELEWY24_SANDBOX`, `MEDUSA_BACKEND_URL`, `STOREFRONT_URL`,
`UPSTASH_REDIS_REST_URL/TOKEN` (rate-limit), `RECONCILE_CRON_SECRET`,
`INTERNAL_EMAIL_SECRET`, `MEDUSA_WORKER_MODE=shared`, opcjonalnie
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`. Pełna lista
z opisami: `blueprints/checkout-p24/README.md`.
