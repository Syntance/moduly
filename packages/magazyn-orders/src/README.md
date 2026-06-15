# Moduł: Zamówienia

Lista zamówień (szukajka, sortowanie, filtry statusu/płatności/wysyłki) + widok
szczegółów z pozycjami, adresami, metadanymi i panelem akcji:

- **Zaksięguj płatność** → capture + start realizacji (fulfillment),
- **Przesyłka wysłana** → shipment,
- **Zakończ zamówienie** → complete,
- **Anuluj zamówienie** → cancel.

Po każdej akcji (gdy moduł `emails` jest włączony) wysyłany jest mail odpowiedniego etapu.

## Pliki

| Plik | Rola |
| --- | --- |
| `order-types.ts` | Typy domenowe (status, adresy, pozycje) |
| `store.ts` | Medusa Admin API: lista, szczegóły, mutacje, `orderToEmailSource` |
| `order-status.ts` | Etykiety + tonacje statusów (badge) |
| `orders-list.tsx` | Tabela z filtrami i sortowaniem |
| `order-table-row.tsx` | Wiersz-link do szczegółów |
| `order-actions.tsx` | Przyciski akcji zamówienia |
| `actions.ts` | Server Action `runOrderAction` + powiadomienie mailowe |
| `page.tsx` | Lista (`/…/zamowienia`) |
| `order-detail-page.tsx` | Szczegóły (`/…/zamowienia/[id]`) |

## Wdrożenie

```ts
// app/<basePath>/(panel)/zamowienia/page.tsx
export { default, dynamic } from "@magazyn/modules/orders/page";

// app/<basePath>/(panel)/zamowienia/[id]/page.tsx
export { default, dynamic, revalidate } from "@magazyn/modules/orders/order-detail-page";
```

Widok szczegółów używa `next/image` dla miniatur — dodaj host backendu Medusa do
`images.remotePatterns` w `next.config`.

## Dostosowywanie

- Metadane na karcie zamówienia: `META_LABELS` w `order-detail-page.tsx`.
- Reguły dostępności akcji: `actionFlags` w `order-detail-page.tsx`.
- Etykiety statusów: `order-status.ts`.
