import {
  CustomerOtpAuth,
  createMemoryCustomerOtpStore,
  type CustomerOtpRecord,
  type CustomerOtpStore,
} from "./auth/customer-otp";
import Redis from "ioredis";
import { getResendConfig } from "./resend-defaults";

let otpStore: CustomerOtpStore | null = null;
let otpAuth: CustomerOtpAuth | null = null;
let redisClient: Redis | null = null;

function createRedisCustomerOtpStore(redisUrl: string): CustomerOtpStore {
  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redisClient.on("error", () => {});
  }

  return {
    async get(key: string) {
      const raw = await redisClient!.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as CustomerOtpRecord;
    },
    async set(key: string, value: CustomerOtpRecord, ttlMs: number) {
      await redisClient!.set(key, JSON.stringify(value), "PX", ttlMs);
    },
    async delete(key: string) {
      await redisClient!.del(key);
    },
  };
}

function resolveOtpStore(): CustomerOtpStore {
  if (otpStore) return otpStore;
  const redisUrl = process.env.REDIS_URL?.trim();
  otpStore = redisUrl
    ? createRedisCustomerOtpStore(redisUrl)
    : createMemoryCustomerOtpStore();
  return otpStore;
}

export function getCustomerOtpAuth(): CustomerOtpAuth {
  if (otpAuth) return otpAuth;

  const jwtSecret =
    process.env.CUSTOMER_JWT_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "dev-customer-jwt-secret-change-me";

  otpAuth = new CustomerOtpAuth(
    {
      jwtSecret,
      cookieName: process.env.CUSTOMER_SESSION_COOKIE ?? "customer_session",
      maxAgeSeconds: Number(process.env.CUSTOMER_SESSION_TTL_SEC ?? 604800),
      secure: process.env.NODE_ENV === "production",
      issuer: "moduly-customer",
    },
    resolveOtpStore(),
  );

  return otpAuth;
}

export async function sendCustomerOtpEmail(
  email: string,
  code: string,
): Promise<boolean> {
  const { apiKey, from } = getResendConfig();
  if (!apiKey) {
    console.warn("[customer-otp] brak RESEND_API_KEY — kod tylko w logu dev");
    if (process.env.NODE_ENV !== "production") {
      console.info(`[customer-otp] ${email} → ${code}`);
      return true;
    }
    return false;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Twój kod logowania do panelu klienta",
    text: `Kod logowania: ${code}\n\nKod jest ważny 10 minut. Jeśli to nie Ty — zignoruj tę wiadomość.`,
    html: `<p>Twój kod logowania: <strong>${code}</strong></p><p>Kod jest ważny 10 minut.</p>`,
  });

  if (error) {
    console.error("[customer-otp] Resend:", error.message);
    return false;
  }
  return true;
}

/** Singleton reset — tylko do testów. */
export function resetCustomerAuthForTests(): void {
  otpStore = null;
  otpAuth = null;
}
