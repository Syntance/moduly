# Moduł: Maile (edytor maili transakcyjnych)

Wizualny, blokowy edytor maili transakcyjnych (drag&drop, email-safe HTML).
Szablony zapisywane są w **metadanych sklepu Medusa** (`store.metadata.email_templates`),
więc nie wymagają osobnej bazy. Zapisany szablon **nadpisuje** wysyłkę danego etapu;
gdy go brak — używany jest szablon domyślny z kodu (`buildDefaultTemplate`).

## Co zawiera

| Plik | Rola |
| --- | --- |
| `template-types.ts` | Model bloków, motyw, walidacja Zod, szablony domyślne (z `magazyn.config.ts`) |
| `render-template.ts` | Renderer → email-safe HTML + plaintext, merge `{{zmiennych}}` |
| `store.ts` | Odczyt/zapis szablonów w metadanych sklepu Medusa |
| `send-transactional.ts` | Wysyłka przez Resend (skip bez `RESEND_API_KEY`) |
| `send-order-email.ts` | Wysyłka maila etapu dla zamówienia (z fallbackiem na domyślny) |
| `actions.ts` | Server Actions: zapis, reset, upload obrazu, test wysyłki |
| `*.tsx`, `*.css` | UI edytora (kanwa, inspektor bloku, panel motywu, pola) |
| `page.tsx` | Strona panelu (`/…/maile`) |

## Wdrożenie w nowym sklepie

1. Skopiuj `core/` i `modules/emails/` do projektu (zachowaj strukturę) i ustaw alias
   `@magazyn/*` w `tsconfig.json` (patrz README główne).
2. Zainstaluj zależności: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities resend zod lucide-react`.
3. Ustaw w `.env.local`: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   oraz (do wysyłki w pipeline bez sesji) `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`.
4. Dostosuj w `magazyn.config.ts`: `branding`, `emailTheme`, `email` (nadawca, kontakt, stopka, siteUrl).
5. Podepnij stronę:

```ts
// app/<basePath>/(panel)/maile/page.tsx
export { default, dynamic } from "@magazyn/modules/emails/page";
```

## Wysyłka maila etapu z pipeline zamówień

```ts
import { sendOrderStageEmail } from "@magazyn/modules/emails/send-order-email";

await sendOrderStageEmail("shipped", {
  displayId: order.displayId,
  email: order.email,
  phone: order.phone,
  currencyCode: order.currencyCode,
  total: order.total,
  itemTotal: order.itemTotal,
  shippingTotal: order.shippingTotal,
  shippingMethodName: order.shippingMethodName,
  customerName: "Anna",
  address: "ul. Przykładowa 1, 00-000 Miasto",
  items: order.items.map((i) => ({ title: i.title, subtitle: i.subtitle, quantity: i.quantity, total: "…", thumbnail: i.thumbnail })),
});
```

## Dostosowywanie

- **Zmienne** (`{{token}}`): edytuj `MERGE_VARIABLES` w `template-types.ts`.
- **Motyw domyślny / branding**: `magazyn.config.ts` (`emailTheme`, `branding`, `email`).
- **Etapy maili**: `EMAIL_TEMPLATE_TYPES` + `STAGE_CONTENT` w `template-types.ts`.
- **Nowe typy bloków**: dodaj typ, schemat Zod, `createBlock`, render w `render-template.ts` i edytor w `block-inspector.tsx`.
