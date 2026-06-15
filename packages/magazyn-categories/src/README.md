# Moduł: Kategorie

CRUD kategorii produktów (Medusa `product-categories`): lista + formularz dodawania/edycji,
slug generowany automatycznie z nazwy, flaga „aktywna" (widoczność w sklepie),
licznik produktów i bezpieczne usuwanie z potwierdzeniem.

## Pliki

| Plik | Rola |
| --- | --- |
| `store.ts` | Wywołania Medusa Admin API (list/create/update/delete) |
| `actions.ts` | Server Actions z walidacją Zod + `revalidatePath` |
| `categories-manager.tsx` | UI (lista + formularz) |
| `page.tsx` | Strona panelu (`/…/kategorie`) |

## Wdrożenie

```ts
// app/<basePath>/(panel)/kategorie/page.tsx
export { default, dynamic } from "@magazyn/modules/categories/page";
```

Włącz/wyłącz w `magazyn.config.ts` → `modules.categories`.

## Dostosowywanie

- Pola kategorii: rozszerz `CategoryInput`/`AdminCategory` w `store.ts` i formularz w `categories-manager.tsx`.
- Walidacja: `schema` w `actions.ts`.
