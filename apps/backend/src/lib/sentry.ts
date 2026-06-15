import * as Sentry from "@sentry/node";

/**
 * PII-safe scrubbing — identyczna intencja co w storefroncie, ale dla Node
 * tu mamy dostęp do pełnego requestu/responsu z Medusy. Nie chcemy w Sentry
 * trzymać maila klienta, adresu, numeru telefonu, tokenów ani cookies.
 */
const PII_KEYS = new Set<string>(
  [
    "email",
    "phone",
    "telefon",
    "firstName",
    "first_name",
    "imie",
    "lastName",
    "last_name",
    "nazwisko",
    "name",
    "fullName",
    "address",
    "adres",
    "street",
    "ulica",
    "city",
    "miasto",
    "postalCode",
    "postal_code",
    "kod_pocztowy",
    "zip",
    "country",
    "kraj",
    "pesel",
    "nip",
    "regon",
    "password",
    "token",
    "authorization",
    "cookie",
    "setCookie",
    "x-publishable-api-key",
    "x-webhook-secret",
    "x-order-email-secret",
    "stripe_key",
    "p24_crc",
    // Odbiorcy maili (np. kontekst captureError w send-email.ts) — to też PII.
    "to",
    "cc",
    "bcc",
    "replyto",
    "reply_to",
    // IP klienta.
    "ip",
    "ip_address",
    "x-forwarded-for",
    "x-real-ip",
    "remoteaddress",
  ].map((k) => k.toLowerCase()),
);

/** Maskuje adresy e-mail w wolnym tekście (message/breadcrumb). */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
function redactEmails(text: string): string {
  return text.replace(EMAIL_RE, "[redacted-email]");
}

function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = redactDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

let initialized = false;

/**
 * Odpalamy raz na proces — Medusa v2 ładuje `medusa-config.ts` wiele razy
 * w niektórych kontekstach (CLI + API), nie chcemy mnożyć instancji.
 */
export function initSentry(): void {
  if (initialized) return;
  if (!process.env.SENTRY_DSN) return;
  initialized = true;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,

    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),

    // Wyłączamy domyślne wsadzanie IP/user data — same dodamy, co potrzeba.
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = redactDeep(event.request.data);
      }
      if (event.request?.headers) {
        event.request.headers = redactDeep(event.request.headers) as typeof event.request.headers;
      }
      if (event.request?.cookies) {
        event.request.cookies = redactDeep(event.request.cookies) as typeof event.request.cookies;
      }
      if (event.request?.query_string && typeof event.request.query_string === "string") {
        event.request.query_string = "[redacted]";
      }
      if (event.extra) {
        event.extra = redactDeep(event.extra) as typeof event.extra;
      }
      if (event.user) {
        // Tylko id — żadnego email/ip/username.
        event.user = { id: event.user.id };
      }
      // Maskujemy e-maile w komunikacie błędu.
      if (typeof event.message === "string") {
        event.message = redactEmails(event.message);
      }
      // Scrubbing breadcrumbs (dane strukturalne + e-maile w wiadomościach).
      if (Array.isArray(event.breadcrumbs)) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          message:
            typeof breadcrumb.message === "string"
              ? redactEmails(breadcrumb.message)
              : breadcrumb.message,
          data: breadcrumb.data
            ? (redactDeep(breadcrumb.data) as typeof breadcrumb.data)
            : breadcrumb.data,
        }));
      }
      return event;
    },

    ignoreErrors: [
      // Klient rozłączył się przed odpowiedzią — nic z tym nie robimy.
      "AbortError",
      "ECONNRESET",
      "socket hang up",
    ],
  });
}

/**
 * Zgłoszenie błędu z kontekstem. Wywołujemy w miejscach, gdzie łapiemy
 * wyjątki ręcznie (np. w subscriberach), żeby Sentry widział nie tylko
 * nieobsłużone crashe procesu.
 */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("moduly", redactDeep(context) as Record<string, unknown>);
    }
    Sentry.captureException(err);
  });
}
