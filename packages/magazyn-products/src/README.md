# Moduł: Produkty

CRUD produktów Medusa — wersja **uogólniona** (bez konfiguratora kolorów, podstawki, pól tekstowych ani uploadu plików przez klienta).

Pola: nazwa, opis, status, kategorie, cena (jeden wariant), slug, zdjęcia, min. ilość, callout PDP, SEO + FAQ.

## Wdrożenie

```ts
// app/<basePath>/(panel)/produkty/page.tsx
export { default, dynamic } from "@moduly/magazyn-products/page";

// app/<basePath>/(panel)/produkty/nowy/page.tsx
export { default, dynamic } from "@moduly/magazyn-products/new-product-page";

// app/<basePath>/(panel)/produkty/[id]/page.tsx
export { default, dynamic } from "@moduly/magazyn-products/edit-product-page";
```

Wywołaj `configureMagazynModules(modulyConfig)` przy starcie aplikacji.
