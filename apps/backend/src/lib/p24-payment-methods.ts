import {
  fetchP24PaymentMethods,
  type P24ApiConfig,
} from "./p24-transaction-api";

export const P24_METHOD_ID_METADATA_KEY = "p24_method_id";
export const P24_METHOD_NAME_METADATA_KEY = "p24_method_name";
/** Czytelna etykieta metody płatności w panelu / mailach. */
export const PAYMENT_LABEL_METADATA_KEY = "payment";

export const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";

type MethodsCache = {
  fetchedAt: number;
  byId: Map<number, string>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let methodsCache: MethodsCache | null = null;

export type P24MethodKind = "blik" | "card" | "wallet" | "transfer";

/**
 * Klasyfikacja metody P24 po nazwie. Metody bez rozpoznawalnej nazwy
 * (BLIK / karta / portfel) to w praktyce przelewy bankowe — pay-by-link P24
 * nazywa je po banku („mTransfer”, „ING”, „Płacę z iPKO”…).
 */
export function classifyP24Method(methodName: string): P24MethodKind {
  const name = methodName.toLowerCase();
  if (name.includes("blik")) return "blik";
  if (/karta|card|visa|mastercard/.test(name)) return "card";
  if (/google\s*pay|apple\s*pay|paypal/.test(name)) return "wallet";
  return "transfer";
}

/**
 * Etykieta metody płatności w Magazynie/mailach — np. „Przelewy24 (BLIK)”,
 * a dla banków jawnie „Przelewy24 (przelew — mTransfer)”, żeby obsługa od
 * razu wiedziała, że klient płacił przelewem (przez bramkę P24).
 */
export function formatP24PaymentLabel(methodName: string): string {
  const trimmed = methodName.trim();
  if (!trimmed) return "Przelewy24";
  if (classifyP24Method(trimmed) === "transfer") {
    return `Przelewy24 (przelew — ${trimmed})`;
  }
  return `Przelewy24 (${trimmed})`;
}

/** Zwraca nazwę metody P24 po numeric id (cache + API). */
export async function resolveP24MethodName(
  methodId: number,
  config: P24ApiConfig | null,
): Promise<string | null> {
  if (!Number.isFinite(methodId) || methodId <= 0) return null;

  const cached = methodsCache?.byId.get(methodId);
  if (cached) return cached;

  if (!config) return null;

  const now = Date.now();
  if (!methodsCache || now - methodsCache.fetchedAt > CACHE_TTL_MS) {
    const methods = await fetchP24PaymentMethods(config);
    const byId = new Map<number, string>();
    for (const method of methods) {
      if (method.id > 0 && method.name.trim()) {
        byId.set(method.id, method.name.trim());
      }
    }
    methodsCache = { fetchedAt: now, byId };
  }

  return methodsCache.byId.get(methodId) ?? null;
}

export function readP24MethodIdFromSessionData(
  data: Record<string, unknown> | null | undefined,
): number | null {
  if (!data) return null;
  const fromExtract = extractP24MethodId(data);
  if (fromExtract) return fromExtract;
  const raw = data.p24_method_id ?? data.methodId;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function extractP24MethodId(data: Record<string, unknown>): number | null {
  for (const key of [
    "methodId",
    "method",
    "paymentMethod",
    "payment_method",
    "paymentMethodId",
    "p24_method_id",
  ]) {
    const id = Number(data[key]);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

export function readP24MethodNameFromSessionData(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  const raw = data.p24_method_name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
