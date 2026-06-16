# ADR 005: Panel analityki GA4 + PostHog w magazynie

## Status

Zaakceptowane — 2026-06-15

## Context

Panel `/magazyn/panel/statystyki` miał statyczne dane demo (recharts). Potrzebny jest widok live z dwóch źródeł:

- **GA4** — ruch, kanały, top strony, przychód z `purchase`
- **PostHog** — lejek e-commerce (`product_view` → `purchase`), top zdarzenia, trend `$pageview`

Klucze API nie mogą trafić do bundle klienta. Zgodność z GDPR: dane agregowane, bez PII w panelu.

## Decision

1. Nowy pakiet `@moduly/magazyn-analytics` z fetcherami **server-only**.
2. GA4: `@google-analytics/data` + service account (`GA4_SERVICE_ACCOUNT_JSON`).
3. PostHog: REST Query API (`POST /api/projects/:id/query/`) + Personal API Key.
4. Cache `unstable_cache` 15 min — limit rate API.
5. UI: zakładki Łącznie / GA4 / PostHog; fallback do demo (`StatisticsView`) gdy brak ENV.
6. Feature flag: `FEATURE_ANALYTICS_PANEL=1` (domyślnie włączone).

## Consequences

- Wymaga konfiguracji service account GA4 z dostępem Reader do property.
- PostHog wymaga spójnych nazw eventów e-commerce w storefront.
- Przy błędzie API panel pokazuje komunikat, nie crashuje całej strony.
- Storefront: `@moduly/analytics` + `@syntance/analytics-events` — wdrożone; konfiguracja kluczy: [analytics.md](../analytics.md).
- Lejek PostHog w panelu używa nazwy `product_view` (słownik Syntance), nie `view_item`.

## Alternatives

- **Tylko PostHog** — prostsze, ale traci dane attribution GA4.
- **Looker Studio embed** — szybkie, ale gorsze UX w panelu i iframe CSP.
- **BigQuery export** — skalowalne, ale overkill na MVP.
