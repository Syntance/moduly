/**
 * Synchronizacja blueprintu checkout-p24 z produkcji (repo Lumine).
 *
 * ĹąrĂłdĹ‚o prawdy: E:\Software development\lumineconcept (stan pancerny po
 * audycie 06.07.2026 â€” ADR 007). Uruchamiaj po kaĹĽdej rundzie poprawek
 * checkoutu w Lumine, potem przejrzyj `git diff blueprints/`.
 *
 *   node scripts/sync-checkout-blueprint.mjs [--source <Ĺ›cieĹĽka-do-lumine>]
 *
 * Transformacje: rename brandu (lumineâ†’moduly, takĹĽe w nazwach plikĂłw),
 * mapowanie importĂłw prywatnych Lumine na pliki lokalne blueprintu
 * (shop-types, money-format, promotions/constants, stuby analytics).
 * Skrypt NIE nadpisuje plikĂłw spoza listy i koĹ„czy raportem nierozwiÄ…zanych
 * importĂłw (to lista rÄ™cznych poprawek â€” powinna byÄ‡ pusta).
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
  console.error(`Brak repo ĹşrĂłdĹ‚owego: ${LUMINE}`);
  process.exit(1);
}

/** KolejnoĹ›Ä‡ MA znaczenie: Ĺ›cieĹĽki specyficzne przed generycznym rename brandu. */
const REPLACERS = [
  [/@lumine\/types/g, "@/lib/shop-types"],
  [/@magazyn\/core\/lib\/format/g, "@/lib/money-format"],
  // Subpath, NIE barrel: index magazyn-core ciągnie server-only (sharp),
  // a product-thumbnail trafia do bundla klienta przez CartProvider.
  [/@magazyn\/core\/medusa\/media-url/g, "@moduly/magazyn-core/medusa/media-url"],
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
  "src/api/store/custom/notify-bank-transfer/route.ts",
  "src/api/store/custom/notify-order-placed/route.ts",
  "src/api/store/custom/attach-order-notes/route.ts",
  "src/subscribers/order-placed.ts",
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

/* ---------- pliki generowane (zamienniki prywatnych zaleĹĽnoĹ›ci Lumine) ---------- */

const GENERATED = {
  "storefront/lib/shop-types.ts": `/** Minimalne typy wspĂłĹ‚dzielone checkoutu (zamiennik @lumine/types). */
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
  "storefront/lib/promotions/constants.ts": `/** StaĹ‚e promocji dostawy â€” parytet z magazynem (moduĹ‚ promotions). */
export const MODULY_FS_PREFIX = "__moduly_fs_";

export function isShadowFreeShippingCode(code: string): boolean {
  return code.startsWith(MODULY_FS_PREFIX);
}

/** MUSI byÄ‡ identyczna ze staĹ‚Ä… backendu (backend/src/lib/express-fee.ts). */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "DopĹ‚ata ekspresowa (+50%)";
`,
  "storefront/lib/analytics/useAnalytics.ts": `"use client";

/**
 * STUB analytics â€” podmieĹ„ na @moduly/analytics przy podpinaniu analityki.
 * API zgodne z produkcyjnym hookiem (track, identifyLead).
 */
export function useAnalytics() {
  return {
    track: (_event: string, _payload?: Record<string, unknown>) => {},
    identifyLead: (
      _lead: { email: string; name?: string; source?: string },
    ) => {},
  };
}
`,
  "storefront/lib/analytics/destinations/posthog.ts": `/** STUB PostHog â€” podmieĹ„ na @moduly/analytics. */
export function getDistinctId(): string | undefined {
  return undefined;
}
export function getSessionId(): string | undefined {
  return undefined;
}
`,
  "storefront/lib/analytics/traffic-source.ts": `/** STUB traffic source â€” podmieĹ„ na @moduly/analytics. */
export function getTrafficSourceMetadata(): string | undefined {
  return undefined;
}
`,
  "storefront/lib/analytics/track.ts": `/** STUB track â€” podmieĹ„ na @moduly/analytics. */
export function track(_event: string, _payload?: Record<string, unknown>): void {}
`,
  "storefront/lib/analytics/upsell-attribution.ts": `/** STUB atrybucji upsell â€” podmieĹ„ na @moduly/analytics. */
export type UpsellReferral = { fromProductId: string };

export function consumeUpsellReferral(_productId: string): UpsellReferral | null {
  return null;
}
`,
  "backend/src/lib/meta-capi.ts": `/**
 * STUB Meta Conversions API â€” podmieĹ„ na realnÄ… implementacjÄ™ przy
 * podpinaniu analityki (@moduly/analytics). API zgodne z produkcjÄ….
 */
export const CAPI_PURCHASE_SENT_KEY = "capi_purchase_sent";

export function purchaseEventId(orderId: string): string {
  return \`purchase_\${orderId}\`;
}

export async function sendPurchaseCAPI(
  _scope: unknown,
  _order: unknown,
  _options?: { fbp?: string; fbc?: string },
): Promise<void> {
  /* no-op â€” stub */
}
`,
  "storefront/lib/analytics/events/registry.ts": `/** STUB typĂłw eventĂłw â€” podmieĹ„ na @moduly/analytics-events. */
export type EcommerceItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
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
  source: "lumineconcept (produkcja) â€” ADR 007",
  synced_at: new Date().toISOString(),
  install: {
    backend: "skopiuj backend/* do apps/backend/ projektu (scal src/, tests/)",
    storefront: "skopiuj storefront/* do apps/<storefront>/ projektu",
  },
  env: {
    PRZELEWY24_MERCHANT_ID: "ID merchanta P24 (= POS ID przy koncie prostym)",
    PRZELEWY24_POS_ID: "POS ID (opcjonalne, domyĹ›lnie MERCHANT_ID)",
    PRZELEWY24_CRC: "klucz CRC z panelu P24",
    PRZELEWY24_API_KEY: "klucz API (raporty/verify) z panelu P24",
    PRZELEWY24_SANDBOX: "true dla sandboxa",
    MEDUSA_BACKEND_URL: "publiczny URL backendu (webhook P24!)",
    STOREFRONT_URL: "publiczny URL sklepu (urlReturn)",
    UPSTASH_REDIS_REST_URL: "rate-limit prepare-checkout",
    UPSTASH_REDIS_REST_TOKEN: "rate-limit prepare-checkout",
    RECONCILE_CRON_SECRET: "Bearer dla /api/cron/reconcile-payments",
    INTERNAL_EMAIL_SECRET: "wspĂłlny sekret frontâ†”back dla maili",
    MEDUSA_WORKER_MODE: "shared (joby reconcile!)",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "publishable key sklepu",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "(opcjonalnie) Turnstile",
    TURNSTILE_SECRET_KEY: "(opcjonalnie) Turnstile",
    SENTRY_DSN: "(zalecane) alerty niezgodnoĹ›ci kwot / cudzego koszyka",
  },
  files: copied.sort(),
};
writeFileSync(join(OUT, "MANIFEST.json"), JSON.stringify(manifest, null, 2));

/* ---------- skan nierozwiÄ…zanych importĂłw ---------- */

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

console.log(`Skopiowano ${copied.length} plikĂłw do blueprints/checkout-p24.`);
if (missing.length) {
  console.log(`\nBRAK W ĹąRĂ“DLE (${missing.length}):`);
  for (const m of missing) console.log(`  - ${m}`);
}
if (unresolved.size) {
  console.log(`\nNIEROZWIÄ„ZANE IMPORTY (${unresolved.size}) â€” do rÄ™cznej poprawki:`);
  for (const u of [...unresolved].sort()) console.log(`  - ${u}`);
} else {
  console.log("\nWszystkie importy rozwiÄ…zane wewnÄ…trz blueprintu.");
}
