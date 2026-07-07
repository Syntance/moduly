import type {
  INotificationModuleService,
  MedusaContainer,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import { Resend } from "resend";
import type { OrderEmailPayload } from "./email-templates";
import { getResendConfig } from "./resend-defaults";
import { captureError } from "./sentry";

/** Maskuje e-mail do logów: `jan.kowalski@x.pl` → `ja***@x.pl` (PII hygiene). */
function maskEmail(email: string | undefined | null): string {
  if (!email) return "[brak]";
  const [local, domain] = email.split("@");
  if (!domain || !local) return "[masked]";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

/**
 * Bezpośrednia wysyłka przez Resend (ten sam kontrakt co `notification-resend`).
 * Używana gdy moduł `@medusajs/medusa/notification` nie jest załadowany
 * (np. stary deploy bez `RESEND_API_KEY`) albo `createNotifications` rzuca.
 * Bez idempotency po stronie Medusy — preferuj pełną konfigurację modułu.
 */
async function sendViaResendApi(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  context: string;
}): Promise<boolean> {
  const { apiKey, from, replyTo } = getResendConfig();
  if (!apiKey) {
    console.warn(
      `[mail:${params.context}] Resend API — brak RESEND_API_KEY, nie wysłano`,
    );
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      replyTo,
    });
    if (error) {
      console.error(
        `[mail:${params.context}] Resend: ${error.name} — ${error.message}`,
      );
      return false;
    }
    console.info(
      `[mail:${params.context}] Resend (direct) id=${data?.id} → ${maskEmail(params.to)}`,
    );
    return true;
  } catch (e) {
    console.error(`[mail:${params.context}] Resend (direct) wyjątek:`, e);
    captureError(e, { mail: `${params.context}-resend-direct`, to: params.to });
    return false;
  }
}

/**
 * Zuniformowany helper do wysyłki maila. Izolujemy błędy providera (Resend
 * może być przejściowo niedostępny, limity API itp.) — subscriber nigdy nie
 * powinien się wysypywać tylko dlatego że mail nie poszedł. Każdy błąd
 * logujemy do konsoli + Sentry, ale zwracamy `false` żeby warstwa wyżej
 * mogła się zdecydować.
 */
export async function sendTransactionalEmail(
  container: MedusaContainer,
  params: {
    to: string;
    channel?: "email";
    subject: string;
    html: string;
    text?: string;
    context: string; // np. "order-placed" — do logów/Sentry
    orderId?: string;
  },
): Promise<boolean> {
  const { to, subject, html, text, context, orderId } = params;

  if (!to) {
    console.warn(`[mail:${context}] brak adresata — pomijam wysyłkę`);
    return false;
  }

  // Resend API bezpośrednio — najpewniejsza ścieżka (moduł Notification
  // potrafi zwrócić sukces bez realnej dostawy przy błędnym providerze).
  if (getResendConfig().configured) {
    return sendViaResendApi({ to, subject, html, text, context });
  }

  let notificationService: INotificationModuleService;
  try {
    notificationService = container.resolve(Modules.NOTIFICATION);
  } catch (_e) {
    console.warn(
      `[mail:${context}] brak RESEND_API_KEY i modułu Notification — mail nie wysłany`,
    );
    return false;
  }

  try {
    await notificationService.createNotifications({
      to,
      channel: "email",
      template: context,
      content: {
        subject,
        html,
        ...(text ? { text } : {}),
      },
      data: orderId ? { order_id: orderId } : undefined,
      ...(orderId
        ? {
            resource_id: orderId,
            resource_type: "order",
            idempotency_key: `${context}:${orderId}`,
          }
        : {}),
    });
    console.info(`[mail:${context}] wysłano do ${maskEmail(to)}`);
    return true;
  } catch (err) {
    console.error(`[mail:${context}] błąd createNotifications do ${maskEmail(to)}:`, err);
    captureError(err, { mail: context, orderId, to });
    return false;
  }
}

/** Pobiera zamówienie pod maile — remoteQuery zamiast retrieveOrder (bez błędu „strategy”). */
export async function retrieveOrderForEmail(
  scope: MedusaContainer,
  orderId: string,
): Promise<Record<string, unknown> | null> {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const query = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: { id: orderId } },
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "item_total",
      "shipping_total",
      "subtotal",
      "payment_status",
      "metadata",
      "*items",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.unit_price",
      "items.thumbnail",
      "*shipping_address",
      "shipping_methods.name",
    ],
  });
  const rows = await remoteQuery(query);
  const order = Array.isArray(rows) ? rows[0] : rows;
  return order ? (order as Record<string, unknown>) : null;
}

/**
 * Mapuje obiekt Order z Medusa Order module na płaski payload używany przez
 * szablony. Izolacja mapowania upraszcza testy (nie musimy mockować pełnego
 * modelu Medusy) i pozwala zachować szablony bez wiedzy o strukturze bazy.
 */
export function buildOrderEmailPayload(
  order: Record<string, unknown>,
  overrides: Partial<OrderEmailPayload> = {},
): OrderEmailPayload {
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shipping_address as Record<string, unknown> | null;
  const shippingMethods = Array.isArray(order.shipping_methods)
    ? (order.shipping_methods as Array<Record<string, unknown>>)
    : [];
  const shippingMethod = shippingMethods[0]?.name as string | undefined;

  const storefrontUrl =
    process.env.STOREFRONT_URL ??
    process.env.STORE_CORS ??
    "https://modulyconcept.pl";

  return {
    orderId: (order.id as string) ?? "",
    displayId: (order.display_id as number | undefined) ?? undefined,
    email: (order.email as string) ?? "",
    currencyCode: (order.currency_code as string) ?? "PLN",
    items: items.map((it) => {
      const item = it as Record<string, unknown>;
      return {
        title:
          (item.product_title as string) ??
          (item.title as string) ??
          "Produkt",
        quantity: Number(item.quantity ?? 1),
        unitPriceMinor: Math.round(Number(item.unit_price ?? 0) * 100) || 0,
        thumbnail: (item.thumbnail as string | null) ?? null,
      };
    }),
    subtotalMinor: Math.round(Number(order.item_total ?? order.subtotal ?? 0) * 100) || 0,
    shippingMinor: Math.round(Number(order.shipping_total ?? 0) * 100) || 0,
    totalMinor: Math.round(Number(order.total ?? 0) * 100) || 0,
    shippingAddress: address
      ? {
          firstName: (address.first_name as string | null) ?? null,
          lastName: (address.last_name as string | null) ?? null,
          address1: (address.address_1 as string | null) ?? null,
          postalCode: (address.postal_code as string | null) ?? null,
          city: (address.city as string | null) ?? null,
          country: (address.country_code as string | null) ?? null,
        }
      : null,
    shippingMethod: shippingMethod ?? null,
    trackingNumber: null,
    trackingUrl: null,
    storefrontUrl,
    ...overrides,
  };
}
