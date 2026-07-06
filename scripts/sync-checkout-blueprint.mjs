/**
 * Synchronizacja blueprintu checkout-p24 z produkcji (repo Lumine).
 *
 * Źródło prawdy: E:\Software development\lumineconcept (stan pancerny po
 * audycie 06.07.2026 — ADR 007). Uruchamiaj po każdej rundzie poprawek
 * checkoutu w Lumine, potem przejrzyj `git diff blueprints/`.
 *
 *   node scripts/sync-checkout-blueprint.mjs [--source <ścieżka-do-lumine>]
 *
 * Transformacje: rename brandu (lumine→moduly, także w nazwach plików),
 * mapowanie importów prywatnych Lumine na pliki lokalne blueprintu
 * (shop-types, money-format, promotions/constants, stuby analytics).
 * Skrypt NIE nadpisuje plików spoza listy i kończy raportem nierozwiązanych
 * importów (to lista ręcznych poprawek — powinna być pusta).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argSource = process.argv.indexOf("--source");
const LUMINE =
  argSource !== -1
    ? process.argv[argSource + 1]
    : "E:\\Software development\\lumineconcept";
const OUT = join(ROOT, "blueprints", "checkout-p24");

if (!existsSync(LUMINE)) {
  console.error(`Brak repo źródłowego: ${LUMINE}`);
  process.exit(1);
}

/** Kolejność MA znaczenie: ścieżki specyficzne przed generycznym rename brandu. */
const REPLACERS = [
  [/@lumine\/types/g, "@/lib/shop-types"],
  [/@magazyn\/core\/lib\/format/g, "@/lib/money-format"],
  [/@\/magazyn\/modules\/promotions\/constants/g, "@/lib/promotions/constants"],
  [/@\/lib\/analytics\/useAnalytics/g, "@/lib/analytics/useAnalytics"],
  [/Lumine/g, "Moduly"],
  [/lumine/g, "moduly"],
  [/LUMINE/g, "MODULY"],
];

const BACKEND = [
  "src/modules/przelewy24/index.ts",
  "src/modules/przelewy24/service.ts",
  "src/api/store/custom/prepare-checkout/route.ts",
  "src/api/store/custom/cart-express/route.ts",
  "src/api/store/custom/p24-return-status/route.ts",
  "src/api/store/custom/p24-retry-payment/route.ts",
  "src/api/store/custom/apply-promo-code/route.ts",
  "src/api/store/custom/remove-promo-code/route.ts",
  "src/api/store/custom/reconcile-p24/route.ts",
  "src/api/store/custom/ensure-shipping/route.ts",
  "src/api/store/custom/ensure-payment/route.ts",
  "src/lib/express-fee.ts",
  "src/lib/p24-session-reuse.ts",
  "src/lib/p24-transaction-api.ts",
  "src/lib/p24-reconcile.ts",
  "src/lib/run-p24-reconcile.ts",
  "src/lib/store-cart-fields.ts",
  "src/lib/store-cart-snapshot.ts",
  "src/lib/lumine-promotions.ts",
  "src/lib/ensure-cart-shipping-for-promo.ts",
  "src/lib/cart-checkout-metadata.ts",
  "src/lib/payment-failed-email-dispatch.ts",
  "src/lib/sentry.ts",
  "src/lib/internal-auth.ts",
  "src/lib/order-email-dispatch.ts",
  "src/lib/analytics-consent-metadata.ts",
  "src/lib/order-notes.ts",
  "src/lib/checkout-audit.ts",
  "src/lib/complete-cart-guard.ts",
  "src/lib/p24-payment-methods.ts",
  "src/lib/ensure-lumine-payment.ts",
  "src/lib/ensure-lumine-shipping.ts",
  "src/lib/order-payment-method.ts",
  "src/lib/email-templates.ts",
  "src/lib/order-checkout-metadata.ts",
  "src/lib/order-p24-metadata.ts",
  "src/lib/resend-defaults.ts",
  "src/lib/send-email.ts",
  "src/lib/bank-transfer.ts",
  "src/jobs/reconcile-p24-payments.ts",
  "tests/express-fee.test.ts",
  "tests/p24-session-reuse.test.ts",
  "tests/przelewy24-service.test.ts",
  "tests/p24-return-status.test.ts",
  "tests/p24-reconcile.test.ts",
  "tests/complete-cart-guard.test.ts",
  "tests/p24-payment-methods.test.ts",
];

const STOREFRONT = [
  "providers/CartProvider.tsx",
  "hooks/useCart.ts",
  "components/checkout/CheckoutForm.tsx",
  "components/checkout/OrderSummary.tsx",
  "components/checkout/ShippingSelector.tsx",
  "components/checkout/PaymentSelector.tsx",
  "components/checkout/PromoCodeField.tsx",
  "components/checkout/CheckoutTrustBadges.tsx",
  "components/checkout/TurnstileWidget.tsx",
  "components/cart/CartSummary.tsx",
  "components/cart/ExpressToggle.tsx",
  "components/cart/CartConfiguratorDetails.tsx",
  "lib/medusa/checkout.ts",
  "lib/medusa/cart.ts",
  "lib/medusa/cart-bootstrap.ts",
  "lib/medusa/client.ts",
  "lib/medusa/region.ts",
  "lib/medusa/resolve-fetch-base.ts",
  "lib/medusa/transient-error.ts",
  "lib/medusa/product-thumbnail.ts",
  "lib/cart/line-config-fingerprint.ts",
  "lib/checkout/express-fee.ts",
  "lib/checkout/p24-circuit-breaker.ts",
  "lib/checkout/p24-popup.ts",
  "lib/checkout/sanitize-order-notes.ts",
  "lib/checkout/turnstile.ts",
  "lib/checkout/telemetry.ts",
  "lib/promotions/free-shipping.ts",
  "lib/analytics/medusa-items.ts",
  "lib/analytics/checkout-analytics-context.ts",
  "lib/consent/consent.ts",
  "lib/utils.ts",
  "lib/cart/line-item-extras.ts",
  "lib/medusa/store-fetch.ts",
  "lib/medusa/with-timeout.ts",
  "lib/medusa/ensure-cart-shipping.ts",
  "lib/medusa/resolve-backend-url.ts",
  "hooks/useGlobalColorMap.ts",
  "components/common/Breadcrumbs.tsx",
  "lib/seo/json-ld.ts",
  "lib/files/file-type.ts",
  "app/(shop)/checkout/page.tsx",
  "app/(shop)/checkout/przelewy24/start/page.tsx",
  "app/(shop)/checkout/przelewy24/return/page.tsx",
  "app/(shop)/checkout/p24/retry/page.tsx",
  "app/api/medusa/[...path]/route.ts",
  "tests-e2e/checkout.e2e.spec.ts",
  "tests-e2e/checkout-chaos.e2e.spec.ts",
];

function transform(content) {
  let out = content;
  for (const [pattern, replacement] of REPLACERS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function renameBrandInPath(p) {
  return p.replace(/lumine/g, "moduly").replace(/Lumine/g, "Moduly");
}

const missing = [];
const copied = [];

function copyList(files, srcRoot, outRoot) {
  for (const rel of files) {
    const src = join(srcRoot, rel);
    if (!existsSync(src)) {
      missing.push(relative(LUMINE, src));
      continue;
    }
    const destRel = renameBrandInPath(rel);
    const dest = join(outRoot, destRel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, transform(readFileSync(src, "utf8")));
    copied.push(destRel);
  }
}

copyList(BACKEND, join(LUMINE, "apps", "backend"), join(OUT, "backend"));
copyList(STOREFRONT, join(LUMINE, "apps", "storefront"), join(OUT, "storefront"));

/* ---------- pliki generowane (zamienniki prywatnych zależności Lumine) ---------- */

const GENERATED = {
  "storefront/lib/shop-types.ts": `/** Minimalne typy współdzielone checkoutu (zamiennik @lumine/types). */
export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  company?: string;
}
`,
  "storefront/lib/money-format.ts": `/** Zamiennik @magazyn/core/lib/format dla checkoutu. */
export function toMinorUnitsFromDecimal(amount: number | null | undefined): number {
  if (amount == null || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}
`,
  "storefront/lib/promotions/constants.ts": `/** Stałe promocji dostawy — parytet z magazynem (moduł promotions). */
export const MODULY_FS_PREFIX = "__moduly_fs_";

export function isShadowFreeShippingCode(code: string): boolean {
  return code.startsWith(MODULY_FS_PREFIX);
}

/** MUSI być identyczna ze stałą backendu (backend/src/lib/express-fee.ts). */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "Dopłata ekspresowa (+50%)";
`,
  "storefront/lib/analytics/useAnalytics.ts": `"use client";

/**
 * STUB analytics — podmień na @moduly/analytics przy podpinaniu analityki.
 * API zgodne z produkcyjnym hookiem (track, identifyLead).
 */
export function useAnalytics() {
  return {
    track: (_event: string, _payload?: Record<string, unknown>) => {},
    identifyLead: (_email: string, _source?: string) => {},
  };
}
`,
  "storefront/lib/analytics/destinations/posthog.ts": `/** STUB PostHog — podmień na @moduly/analytics. */
export function getDistinctId(): string | null {
  return null;
}
export function getSessionId(): string | null {
  return null;
}
`,
  "storefront/lib/analytics/traffic-source.ts": `/** STUB traffic source — podmień na @moduly/analytics. */
export function getTrafficSourceMetadata(): string | undefined {
  return undefined;
}
`,
  "storefront/lib/analytics/track.ts": `/** STUB track — podmień na @moduly/analytics. */
export function track(_event: string, _payload?: Record<string, unknown>): void {}
`,
  "storefront/lib/analytics/upsell-attribution.ts": `/** STUB atrybucji upsell — podmień na @moduly/analytics. */
export function consumeUpsellReferral(_productId: string): null {
  return null;
}
`,
  "storefront/lib/analytics/events/registry.ts": `/** STUB typów eventów — podmień na @moduly/analytics-events. */
export type EcommerceItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
};
`,
};

for (const [rel, content] of Object.entries(GENERATED)) {
  const dest = join(OUT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  copied.push(rel);
}

/* ---------- MANIFEST ---------- */

const manifest = {
  name: "checkout-p24",
  source: "lumineconcept (produkcja) — ADR 007",
  synced_at: new Date().toISOString(),
  install: {
    backend: "skopiuj backend/* do apps/backend/ projektu (scal src/, tests/)",
    storefront: "skopiuj storefront/* do apps/<storefront>/ projektu",
  },
  env: {
    PRZELEWY24_MERCHANT_ID: "ID merchanta P24 (= POS ID przy koncie prostym)",
    PRZELEWY24_POS_ID: "POS ID (opcjonalne, domyślnie MERCHANT_ID)",
    PRZELEWY24_CRC: "klucz CRC z panelu P24",
    PRZELEWY24_API_KEY: "klucz API (raporty/verify) z panelu P24",
    PRZELEWY24_SANDBOX: "true dla sandboxa",
    MEDUSA_BACKEND_URL: "publiczny URL backendu (webhook P24!)",
    STOREFRONT_URL: "publiczny URL sklepu (urlReturn)",
    UPSTASH_REDIS_REST_URL: "rate-limit prepare-checkout",
    UPSTASH_REDIS_REST_TOKEN: "rate-limit prepare-checkout",
    RECONCILE_CRON_SECRET: "Bearer dla /api/cron/reconcile-payments",
    INTERNAL_EMAIL_SECRET: "wspólny sekret front↔back dla maili",
    MEDUSA_WORKER_MODE: "shared (joby reconcile!)",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "publishable key sklepu",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "(opcjonalnie) Turnstile",
    TURNSTILE_SECRET_KEY: "(opcjonalnie) Turnstile",
    SENTRY_DSN: "(zalecane) alerty niezgodności kwot / cudzego koszyka",
  },
  files: copied.sort(),
};
writeFileSync(join(OUT, "MANIFEST.json"), JSON.stringify(manifest, null, 2));

/* ---------- skan nierozwiązanych importów ---------- */

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|mjs)$/.test(entry)) yield p;
  }
}

const IGNORED_SPECIFIERS =
  /^(react|next|@medusajs|@upstash|@playwright|vitest|node:|@types|posthog|@sentry|lucide-react|clsx|tailwind|zod|resend)/;

const unresolved = new Set();
for (const file of walk(OUT)) {
  const content = readFileSync(file, "utf8");
  const side = relative(OUT, file).startsWith("backend") ? "backend" : "storefront";
  for (const match of content.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    if (IGNORED_SPECIFIERS.test(spec)) continue;
    let target = null;
    if (spec.startsWith("@/")) {
      target = join(OUT, "storefront", spec.slice(2));
    } else if (spec.startsWith(".")) {
      target = join(dirname(file), spec);
    } else {
      continue;
    }
    const candidates = [
      target,
      `${target}.ts`,
      `${target}.tsx`,
      join(target, "index.ts"),
      join(target, "index.tsx"),
    ];
    if (!candidates.some((c) => existsSync(c))) {
      unresolved.add(`${side}: ${relative(OUT, file)} -> ${spec}`);
    }
  }
}

console.log(`Skopiowano ${copied.length} plików do blueprints/checkout-p24.`);
if (missing.length) {
  console.log(`\nBRAK W ŹRÓDLE (${missing.length}):`);
  for (const m of missing) console.log(`  - ${m}`);
}
if (unresolved.size) {
  console.log(`\nNIEROZWIĄZANE IMPORTY (${unresolved.size}) — do ręcznej poprawki:`);
  for (const u of [...unresolved].sort()) console.log(`  - ${u}`);
} else {
  console.log("\nWszystkie importy rozwiązane wewnątrz blueprintu.");
}
