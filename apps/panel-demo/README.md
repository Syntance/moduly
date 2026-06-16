# @moduly/panel-demo

Wizualny prototyp panelu magazynu (układ Lumine / Outdoor Store) — **tylko demo**, bez backendu Medusy.

## Uruchomienie

Z root monorepo:

```bash
pnpm dev:demo
```

Otwórz [http://localhost:3002/magazyn](http://localhost:3002/magazyn).

## Zakres

- Sidebar, dashboard, moduły (zamówienia, produkty, CMS, maile, formularze…)
- **Statystyki** — zakładki *Sprzedaż* i *Analityka* (GA4 + PostHog, dane przykładowe)
- Ustawienia sklepu w bocznej nawigacji
- Folder `screenshots/` — referencje do zrzutów ekranu

Produkcja: `starter-sklep` / `starter-strona` + pakiety `@moduly/*`.
