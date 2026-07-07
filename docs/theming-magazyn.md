# Theming panelu Magazyn per projekt

Panel we wszystkich projektach ma **układ i strukturę 1:1 z Lumine**
(PanelShell + pakiety `@moduly/magazyn-*`). Pod markę klienta dopasowujesz
wyłącznie tokeny i branding — layoutu nie ruszasz.

## 1. Kolory — tokeny shadcn w `app/globals.css`

Panel renderuje się na semantycznych tokenach. Nadpisz je w projekcie
(wartości w OKLCH, zgodnie ze standardem studia):

```css
:root {
  --background: oklch(0.985 0.004 85);   /* tło paneli */
  --foreground: oklch(0.24 0.02 50);     /* tekst */
  --card: oklch(1 0 0);                  /* karty/sekcje */
  --muted-foreground: oklch(0.52 0.015 55);
  --border: oklch(0.91 0.008 75);
  --accent: oklch(0.62 0.09 55);         /* akcent marki (przyciski, aktywna nawigacja) */
  --destructive: oklch(0.55 0.18 25);
}
```

Minimalny zestaw do podmiany pod markę: `--accent`, `--background`,
`--foreground`, `--border`. Reszta może zostać domyślna.

## 2. Branding — `moduly.config.ts`

```ts
branding: {
  name: "Nazwa Sklepu",        // nagłówek panelu ("Magazyn <Nazwa>")
  // logo/typografia wg PanelBranding w @moduly/ui
},
```

## 3. Typografia

Fonty ładuje projekt (next/font w `app/layout.tsx`); panel dziedziczy
`font-serif`/`font-sans` z klas Tailwinda — zmapuj je w `globals.css`
(`@theme { --font-serif: ...; }`) na fonty marki.

## 4. Moduły panelu — `moduly.config.ts → modules`

`orders, returns, products, categories, promotions, content (CMS), emails,
forms, settings` — flaga `false` chowa moduł z nawigacji i wyłącza trasę.
Sklep: wszystko `true`. Strona (bez commerce): `content`/`forms` + reszta
`false` (starter-strona ustawia to za Ciebie).

## Czego NIE robić

- Nie forkuj komponentów `@moduly/magazyn-*`, żeby zmienić kolor — od tego
  są tokeny. Fork = utrata parytetu z produkcyjnymi poprawkami.
- Nie zmieniaj nazwy metody-dopłaty express per projekt — stała
  `EXPRESS_FEE_SHIPPING_METHOD_NAME` (@moduly/magazyn-core) musi być równa
  stałej backendu (blueprint checkout-p24); od niej zależą wiersz „Dostawa"
  i reguły promocji darmowej dostawy.
