# Analityka Syntance — wdrożenie w projekcie

Przewodnik konfiguracji **client-side trackingu** (`@moduly/analytics` + `@syntance/analytics-events`) oraz **panelu statystyk admina** (`@moduly/magazyn-analytics`). To dwie osobne warstwy — nie mieszaj kluczy API.

## Architektura

| Warstwa | Pakiet | Gdzie działa | Klucze |
|---------|--------|--------------|--------|
| Storefront / panel UI | `@moduly/analytics` | Przeglądarka (prod + zgoda) | `NEXT_PUBLIC_*` |
| Panel `/magazyn/panel/statystyki` | `@moduly/magazyn-analytics` | Serwer Next.js | `GA4_*`, `POSTHOG_PERSONAL_*` |

Komponenty trackują **wyłącznie** przez `useAnalytics()`. Fan-out do GA4 / PostHog / Meta / Clarity odbywa się w `packages/analytics/src/track.ts` → `destinations/*`.

Słownik eventów: `packages/analytics-events` (`EVENT_REGISTRY`, `EventPayloads`).

---

## Checklist wdrożenia (storefront)

### 1. Providery w root layout

Startery mają już:

```tsx
<ConsentProvider siteName="…" privacyPolicyHref="/polityka-prywatnosci">
  <AnalyticsProvider locale="pl-PL">
    {children}
    <CookieConsent />
  </AnalyticsProvider>
</ConsentProvider>
```

Pliki: `apps/starter-sklep/components/providers/providers.tsx`, `apps/starter-strona/components/providers/providers.tsx`.

### 2. Zmienne środowiskowe (client-side)

Skopiuj z `.env.example` do `.env.local` (dev) i ustaw w Vercel/Railway (prod):

```env
# GA4 — Measurement ID (format G-XXXXXXXXXX)
NEXT_PUBLIC_GA4_ID=

# PostHog — Project API Key (publiczny, bezpieczny w bundle)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Meta Pixel — opcjonalnie, wymaga zgody marketing
NEXT_PUBLIC_META_PIXEL_ID=

# Microsoft Clarity — opcjonalnie
NEXT_PUBLIC_CLARITY_ID=
```

**Ważne:**

- Tracking **wysyła eventy tylko gdy** `NODE_ENV=production` **oraz** ustawione ID (`enabled.*()` w `@moduly/analytics`).
- W dev eventy nie lecą do vendorów — to zamierzone (unikaj fałszywych danych).
- PostHog musi być host EU (`https://eu.i.posthog.com`) — zgodność z RODO.

### 3. Gdzie wziąć klucze

#### Google Analytics 4

1. [Google Analytics](https://analytics.google.com/) → Admin → **Data streams** → wybierz strumień web.
2. Skopiuj **Measurement ID** (`G-…`) → `NEXT_PUBLIC_GA4_ID`.
3. **Consent Mode v2** — inicjalizowany automatycznie przez `@moduly/analytics` (`default denied`). Po akceptacji banera cookies aktualizuje się `analytics_storage` / `ad_storage`.
4. W GA4 Admin → **Events** — oznacz konwersje: `purchase`, `generate_lead` (mapowane z `lead_submit`), ewentualnie `sign_up` (`email_signup`).
5. **DebugView** (Admin → DebugView) — smoke test w incognito po akceptacji cookies.

#### PostHog (storefront)

1. Projekt w [PostHog EU](https://eu.posthog.com/).
2. Project Settings → **Project API Key** → `NEXT_PUBLIC_POSTHOG_KEY`.
3. Ustaw `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`.
4. W projekcie: `autocapture: false`, `capture_pageview: false` — już w kodzie; nie włączaj autocapture w UI PostHog.
5. Dashboard lejka e-commerce — eventy: `product_view`, `add_to_cart`, `begin_checkout`, `purchase` (nazwy ze słownika Syntance, **nie** `view_item`).

#### Meta Pixel (opcjonalnie)

1. [Meta Events Manager](https://business.facebook.com/events_manager) → Pixel → ID.
2. `NEXT_PUBLIC_META_PIXEL_ID` — eventy Meta lecą tylko po zgodzie **marketing** i tylko gdy event ma wpis `meta` w `EVENT_REGISTRY`.

#### Microsoft Clarity (opcjonalnie)

1. [Clarity](https://clarity.microsoft.com/) → Project → Settings → **Project ID**.
2. `NEXT_PUBLIC_CLARITY_ID` — aktywne po zgodzie **analytics**.

---

## Checklist wdrożenia (panel statystyk admina)

Osobna warstwa server-only — ADR [005-analytics-panel-ga4-posthog.md](adr/005-analytics-panel-ga4-posthog.md).

```env
FEATURE_ANALYTICS_PANEL=1

# GA4 Data API (service account JSON w jednej linii)
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_JSON=

# PostHog Query API (Personal API Key — NIGDY w NEXT_PUBLIC_*)
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_HOST=https://eu.posthog.com
```

### GA4 service account

1. Google Cloud Console → IAM → **Service account** z rolą dostępu do Analytics Data API.
2. GA4 Admin → Property access management → dodaj service account jako **Viewer**.
3. Wygeneruj klucz JSON → wklej jako `GA4_SERVICE_ACCOUNT_JSON` (Vercel: secret, jedna linia).

### PostHog Personal API Key

1. PostHog → Settings → Personal API Keys → utwórz klucz z dostępem do odczytu projektu.
2. `POSTHOG_PROJECT_ID` — ID z URL projektu (`/project/12345`).
3. Host panelu: `https://eu.posthog.com` (API query), storefront: `https://eu.i.posthog.com` (ingest).

---

## Baner cookies i zgody

Pakiet `@moduly/legal-consent`:

- Domyślnie: brak zgody → **denied** (Consent Mode v2).
- Po akceptacji: `moduly:consent-update` → `@moduly/analytics` aktualizuje GA4 consent i opt-in PostHog.

**Do skonfigurowania ręcznie:**

- Copy banera PL (teksty w `packages/legal-consent` lub override w projekcie).
- Link do polityki prywatności (`privacyPolicyHref`).
- Ewentualnie kategorie: analytics vs marketing (Meta wymaga marketing).

---

## Eventy e-commerce (słownik)

| Event Syntance | GA4 (conversion) | Meta | Gdzie emitowany |
|----------------|------------------|------|-----------------|
| `page_view` | — | — | `AnalyticsProvider` (zmiana trasy) |
| `product_view` | `view_item` | ViewContent | PDP (`ProductViewTracker`) |
| `add_to_cart` | `add_to_cart` | AddToCart | `AddToCartButton` |
| `begin_checkout` | `begin_checkout` | InitiateCheckout | `CheckoutForm` |
| `purchase` | `purchase` | Purchase | `CheckoutForm` |
| `lead_submit` | `generate_lead` | Lead | Checkout / formularz kontaktowy |
| `email_signup` | `sign_up` | CompleteRegistration | Newsletter w checkout |
| `form_start` / `form_submit` / `form_field_error` | — | — | Formularze, checkout |

Wartości `value` i `price` w **groszach** (integer). Zero PII w payloadzie — dozwolone: `email_domain`, kategorie, nazwy pól (bez wartości).

Kontekst automatyczny: `page_type` (`storefront` | `admin` | `account`), `locale`, UTM first-touch.

---

## Smoke test po deployu

1. Otwórz produkcję w **incognito**.
2. Otwórz DevTools → Network — brak hitów GA4/PostHog przed akceptacją cookies.
3. Zaakceptuj baner (analytics).
4. Przejdź PDP → sprawdź `product_view` w GA4 DebugView i PostHog Live Events.
5. Dodaj do koszyka → `add_to_cart`.
6. Rozpocznij checkout → `begin_checkout`.
7. (Testowe zamówienie) → `purchase`.
8. Panel admin `/magazyn/panel/statystyki` — dane live lub demo fallback gdy brak server ENV.

---

## Weryfikacja kodu (CI / przed merge)

```bash
pnpm typecheck && pnpm build

# Goły tracking tylko w destinations (+ consent.ts dla Consent Mode)
rg "gtag\(|fbq\(|posthog\.capture\(" packages apps -g "*.ts" -g "*.tsx"
```

Oczekiwane trafienia: `packages/analytics/src/destinations/*` oraz `packages/analytics/src/consent.ts` (Consent Mode v2).

---

## Rozszerzanie o nowy event

1. Dodaj wpis w `packages/analytics-events/src/registry.ts` + typ w `payloads.ts`.
2. Użyj helpera w `useAnalytics()` lub `track()` w komponencie.
3. Fan-out w `track.ts` obsłuży destynacje wg registry i zgód.
4. Zaktualizuj dashboard PostHog / konwersje GA4 jeśli event jest w lejku.

Reguła Cursor: `.cursor/rules/35-analytics.mdc`.

---

## Zobacz też

- [ADR 005 — panel analityki GA4 + PostHog](adr/005-analytics-panel-ga4-posthog.md)
- [installation.md](installation.md) — uruchomienie starterów
- [security.md](security.md) — PII, Sentry scrubbing
