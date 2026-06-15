import { defineConfig, loadEnv } from "@medusajs/framework/utils";
import { getResendConfig } from "./src/lib/resend-defaults";
import { initSentry } from "./src/lib/sentry";

loadEnv(process.env.NODE_ENV ?? "development", process.cwd());

initSentry();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const IS_BUILD_PHASE =
  process.argv.some((arg) => arg === "build") ||
  /placeholder/i.test(process.env.DATABASE_URL ?? "");

if (IS_PRODUCTION && !IS_BUILD_PHASE && !getResendConfig().configured) {
  console.warn(
    "[medusa-config] RESEND_API_KEY brak — maile transakcyjne (OTP klienta, potwierdzenia) nie będą wysyłane.",
  );
}

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ??
  (IS_PRODUCTION ? "https://api.example.com" : "http://localhost:9000");

const STOREFRONT_URL =
  process.env.STOREFRONT_URL ??
  process.env.STORE_CORS ??
  (IS_PRODUCTION ? "https://example.com" : "http://localhost:3000");

const PLACEHOLDER_SECRET = "supersecret-change-me";

function resolveSecret(name: "JWT_SECRET" | "COOKIE_SECRET"): string {
  const value = process.env[name];
  if (!value || value === PLACEHOLDER_SECRET) {
    if (IS_PRODUCTION && !IS_BUILD_PHASE) {
      throw new Error(
        `[medusa-config] ${name} jest niezdefiniowany lub zawiera domyślny placeholder. ` +
          "Ustaw silny sekret przed deployem.",
      );
    }
    return PLACEHOLDER_SECRET;
  }
  return value;
}

const WORKER_MODE = (process.env.MEDUSA_WORKER_MODE ??
  "shared") as "shared" | "server" | "worker";

const ADMIN_DISABLED =
  process.env.DISABLE_MEDUSA_ADMIN === "true" ||
  WORKER_MODE === "worker" ||
  IS_BUILD_PHASE;

const FEATURE_P24 = process.env.FEATURE_P24 === "1";
const FEATURE_STRIPE = process.env.FEATURE_STRIPE === "1";
const FEATURE_TPAY = process.env.FEATURE_TPAY === "1";

function buildPaymentProviders() {
  const providers: Array<{
    resolve: string;
    id: string;
    options: Record<string, unknown>;
  }> = [];

  if (
    FEATURE_P24 &&
    process.env.PRZELEWY24_MERCHANT_ID &&
    process.env.PRZELEWY24_API_KEY
  ) {
    providers.push({
      resolve: "./src/modules/przelewy24",
      id: "przelewy24",
      options: {
        merchantId: process.env.PRZELEWY24_MERCHANT_ID,
        posId:
          process.env.PRZELEWY24_POS_ID ?? process.env.PRZELEWY24_MERCHANT_ID,
        apiKey: process.env.PRZELEWY24_API_KEY,
        crc: process.env.PRZELEWY24_CRC,
        sandbox: process.env.PRZELEWY24_SANDBOX === "true",
        backendUrl: BACKEND_URL,
        storefrontUrl: STOREFRONT_URL,
      },
    });
  }

  if (FEATURE_STRIPE && process.env.STRIPE_API_KEY) {
    providers.push({
      resolve: "@medusajs/medusa/payment-stripe",
      id: "stripe",
      options: {
        apiKey: process.env.STRIPE_API_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        capture: process.env.STRIPE_CAPTURE !== "false",
      },
    });
  }

  if (
    FEATURE_TPAY &&
    process.env.TPAY_MERCHANT_ID &&
    process.env.TPAY_API_PASSWORD &&
    process.env.TPAY_SECURITY_CODE
  ) {
    providers.push({
      resolve: "./src/modules/tpay",
      id: "tpay",
      options: {
        merchantId: process.env.TPAY_MERCHANT_ID,
        apiPassword: process.env.TPAY_API_PASSWORD,
        securityCode: process.env.TPAY_SECURITY_CODE,
        sandbox: process.env.TPAY_SANDBOX === "true",
        backendUrl: BACKEND_URL,
        storefrontUrl: STOREFRONT_URL,
      },
    });
  }

  return providers;
}

export default defineConfig({
  admin: {
    disable: ADMIN_DISABLED,
    backendUrl: BACKEND_URL,
    maxUploadFileSize: 10 * 1024 * 1024,
  },
  projectConfig: {
    databaseUrl:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    databaseDriverOptions: {
      pool: {
        min: 2,
        max: 20,
      },
      connection: {
        statement_timeout: 30_000,
        idle_in_transaction_session_timeout: 20_000,
        family: 0,
      } as unknown as { ssl?: boolean },
    },
    redisUrl: process.env.REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      storeCors: STOREFRONT_URL,
      adminCors:
        process.env.ADMIN_CORS ?? `${BACKEND_URL},${STOREFRONT_URL}`,
      authCors:
        process.env.AUTH_CORS ?? `${BACKEND_URL},${STOREFRONT_URL}`,
      jwtSecret: resolveSecret("JWT_SECRET"),
      cookieSecret: resolveSecret("COOKIE_SECRET"),
    },
  },
  modules: [
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: {
                    redisUrl: process.env.REDIS_URL,
                    namespace: "moduly_lock:",
                  },
                },
              ],
            },
          },
          ...(WORKER_MODE === "shared"
            ? []
            : [
                {
                  key: "eventBus",
                  resolve: "@medusajs/event-bus-redis",
                  options: {
                    redisUrl: process.env.REDIS_URL,
                    jobOptions: {
                      removeOnComplete: { age: 3600, count: 1000 },
                      removeOnFail: { age: 3600, count: 1000 },
                    },
                  },
                },
                {
                  key: "workflows",
                  resolve: "@medusajs/workflow-engine-redis",
                  options: {
                    redis: { redisUrl: process.env.REDIS_URL },
                  },
                },
                {
                  key: "cache",
                  resolve: "@medusajs/cache-redis",
                  options: {
                    redisUrl: process.env.REDIS_URL,
                    namespace: "moduly_cache:",
                    ttl: 30,
                  },
                },
              ]),
        ]
      : []),
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: buildPaymentProviders(),
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/dpd-fulfillment",
            id: "dpd",
            options: {
              login: process.env.DPD_LOGIN,
              password: process.env.DPD_PASSWORD,
              fid: process.env.DPD_FID,
            },
          },
        ],
      },
    },
    ...(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_ADMIN_KEY
      ? [
          {
            key: "meilisearch",
            resolve: "./src/modules/meilisearch",
            options: {
              host: process.env.MEILISEARCH_HOST,
              adminKey: process.env.MEILISEARCH_ADMIN_KEY,
            },
          },
        ]
      : []),
    {
      key: "product_config",
      resolve: "./src/modules/product-config",
    },
    {
      key: "returns",
      resolve: "./src/modules/returns",
    },
    {
      key: "forms",
      resolve: "./src/modules/forms",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers:
          process.env.S3_BUCKET &&
          process.env.S3_ENDPOINT &&
          process.env.S3_ACCESS_KEY_ID &&
          process.env.S3_SECRET_ACCESS_KEY
            ? [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.S3_FILE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION ?? "auto",
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT,
                    additional_client_config: {
                      forcePathStyle: true,
                    },
                    prefix: process.env.S3_PREFIX ?? "",
                  },
                },
              ]
            : [
                {
                  resolve: "@medusajs/file-local",
                  id: "local",
                  options: {
                    backend_url: `${BACKEND_URL.replace(/\/$/, "")}/static`,
                  },
                },
              ],
      },
    },
    ...(getResendConfig().configured
      ? [
          {
            resolve: "@medusajs/medusa/notification",
            options: {
              providers: [
                {
                  resolve: "./src/modules/notification-resend",
                  id: "resend",
                  options: {
                    channels: ["email"],
                    apiKey: getResendConfig().apiKey,
                    from: getResendConfig().from,
                    replyTo: getResendConfig().replyTo,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
});
