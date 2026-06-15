# Integracja emaili — Backend Medusa + Magazyn Lumine

## Stan obecny

### Architektura

**Backend** (`apps/backend/src/`):
- **Subscribery** (`subscribers/order-placed.ts`, `order-shipped.ts`, `order-canceled.ts`)
  - Nasłuchują eventów Medusa: `order.placed`, `shipment.created`, `order.canceled`
  - Wysyłają emaile przez `sendTransactionalEmail` z `lib/send-email.ts`
- **Szablony HTML** (`lib/email-templates.ts`)
  - Zwykłe funkcje TypeScript zwracające `{ subject, html, text }`
  - Inline CSS, branding Lumine (ciepły brąz/kremowy)
  - Typy: `renderOrderPlacedEmail`, `renderOrderShippedEmail`, `renderOrderCanceledEmail`

**Magazyn** (`apps/storefront/magazyn/modules/emails/`):
- **Wizualny edytor** blokowy (drag & drop) w panelu `/magazyn/panel/maile`
- **Szablony w metadanych Medusa** (`store.metadata.email_templates`)
- **Funkcja wysyłki** `sendOrderStageEmail(type, order)` w `send-order-email.ts`
- **Typy szablonów**: `placed`, `shipped`, `cancelled`, `realization_started`, `completed`, `confirmation`

### Mapowanie typów

| Event Medusa | Subscriber backend | Typ Magazyn |
|---|---|---|
| `order.placed` | `order-placed.ts` | `placed` |
| `shipment.created` / `order.shipment_created` | `order-shipped.ts` | `shipped` |
| `order.canceled` / `order.cancelled` | `order-canceled.ts` | `cancelled` |

## Konfiguracja

### ENV (Railway backend)

```bash
RESEND_API_KEY=re_...           # Klucz API Resend
RESEND_FROM=kontakt@lumineconcept.pl
RESEND_REPLY_TO=kontakt@lumineconcept.pl
```

### ENV (storefront `.env.local`)

```bash
RESEND_API_KEY=re_...                    # Ten sam klucz (wysyłka z Magazynu)
RESEND_FROM_EMAIL=kontakt@lumineconcept.pl
MEDUSA_ADMIN_EMAIL=lumine.strona@gmail.com
MEDUSA_ADMIN_PASSWORD=lumine.strona123
```

## Jak to działa TERAZ

1. **Zamówienie złożone** → event `order.placed`
   - Subscriber `order-placed.ts` wywołuje `renderOrderPlacedEmail(payload)`
   - Wysyła przez `sendTransactionalEmail` (Resend bezpośrednio lub przez moduł `notification-resend`)
   - **Szablon**: HTML z `lib/email-templates.ts` (hardcoded)

2. **Przesyłka wysłana** → event `shipment.created`
   - Subscriber `order-shipped.ts` wywołuje `renderOrderShippedEmail(payload)`
   - **Szablon**: HTML z `lib/email-templates.ts` (hardcoded)

3. **Zamówienie anulowane** → event `order.canceled`
   - Subscriber `order-canceled.ts` wywołuje `renderOrderCanceledEmail(payload)`
   - **Szablon**: HTML z `lib/email-templates.ts` (hardcoded)

## Szablony domyślne w Magazynie

**Zaktualizowane** zgodnie z rzeczywistymi treściami z `apps/backend/src/lib/email-templates.ts`:

- **`placed`**: "Dziękujemy za zamówienie" (bez "Cześć {{imie}}", prostsze intro)
- **`shipped`**: "Zamówienie jest w drodze" (1-2 dni roboczych)
- **`cancelled`**: "Zamówienie anulowane" (zwrot 3-5 dni roboczych)

### Dostosowanie

Aby edytować szablony:
1. Zaloguj się do `/magazyn` (email: `lumine.strona@gmail.com`)
2. Przejdź do `/magazyn/panel/maile`
3. Wybierz zakładkę (Złożone / Wysłane / Anulowane)
4. Edytuj bloki, kolory, teksty
5. Kliknij **Zapisz** — szablon nadpisze domyślny

## Migracja na szablony z Magazynu (PRZYSZŁOŚĆ)

Aby subscribery używały szablonów z Magazynu zamiast `email-templates.ts`:

### Opcja A: Adapter w subscriberze

```typescript
// apps/backend/src/subscribers/order-placed.ts
import { sendOrderStageEmail } from "../../../storefront/magazyn/modules/emails/send-order-email";
import { renderOrderPlacedEmail } from "../lib/email-templates";
import { buildOrderEmailPayload, sendTransactionalEmail } from "../lib/send-email";

// Spróbuj Magazyn, fallback na stary szablon
try {
  const magazynOrder = {
    displayId: order.display_id,
    email: order.email,
    phone: order.phone ?? "",
    currencyCode: order.currency_code,
    total: Math.round(Number(order.total) * 100),
    itemTotal: Math.round(Number(order.item_total) * 100),
    shippingTotal: Math.round(Number(order.shipping_total) * 100),
    shippingMethodName: order.shipping_methods?.[0]?.name ?? null,
    customerName: [order.shipping_address?.first_name, order.shipping_address?.last_name].filter(Boolean).join(" "),
    address: formatAddress(order.shipping_address),
    items: order.items.map(i => ({
      title: i.product_title ?? i.title,
      subtitle: i.variant_title ?? "",
      quantity: i.quantity,
      total: formatPrice(i.unit_price * i.quantity, order.currency_code),
      thumbnail: i.thumbnail,
    })),
  };
  const result = await sendOrderStageEmail("placed", magazynOrder);
  if (result.ok && !result.skipped) return; // Sukces z Magazynu
} catch (e) {
  console.warn("[order-placed] Magazyn mail failed, fallback", e);
}

// Fallback: stary system
const payload = buildOrderEmailPayload(order);
const { subject, html, text } = renderOrderPlacedEmail(payload);
await sendTransactionalEmail(container, {
  to: order.email,
  subject, html, text,
  context: "order-placed",
  orderId: order.id,
});
```

### Opcja B: Feature flag

```bash
# .env.backend (Railway)
USE_MAGAZYN_EMAIL_TEMPLATES=true
```

```typescript
if (process.env.USE_MAGAZYN_EMAIL_TEMPLATES === "true") {
  await sendOrderStageEmail("placed", magazynOrder);
} else {
  // stary system
}
```

## Zalety obecnego rozwiązania

1. **Działa OD RAZU** — subscribery już działają, emaile lecą
2. **Stabilne** — HTML szablony są przetestowane, nie zależą od metadanych Medusa
3. **Prostota** — jeden plik `email-templates.ts`, jeden styl

## Zalety Magazynu (przyszłość)

1. **Wizualna edycja** — bez zmiany kodu, klient może sam edytować
2. **Podgląd LIVE** — test wysyłki bezpośrednio z panelu
3. **Wersjonowanie** — szablony w metadanych Medusa, backup przez eksport store
4. **Spójność** — ten sam system co inne maile (np. custom kampanie)

## Roadmap

- [ ] **Faza 1** (DONE): Magazyn zintegrowany, szablony domyślne zaktualizowane
- [ ] **Faza 2**: Dodać `RESEND_API_KEY` do `.env.local` (lokalnie + Railway deployment storefront)
- [ ] **Faza 3**: Przetestować wysyłkę z panelu Magazyn (/magazyn/panel/maile → Test wysyłki)
- [ ] **Faza 4**: Opcjonalnie przenieść subscribery na `sendOrderStageEmail` z fallbackiem

## Pytania / problemy?

- **Email nie leci**: sprawdź `RESEND_API_KEY` w Railway (backend i storefront)
- **Szablon z Magazynu nie działa**: upewnij się że `MEDUSA_ADMIN_EMAIL` / `PASSWORD` są ustawione (potrzebne do fetch metadanych store)
- **Chcę edytować stare szablony**: obecnie w `apps/backend/src/lib/email-templates.ts` (hardcoded HTML)
