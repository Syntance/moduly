import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import { loadP24ApiConfig, fetchP24TransactionBySessionId, fetchP24TransactionByOrderId } from "./p24-transaction-api";
import {
  formatP24PaymentLabel,
  P24_METHOD_ID_METADATA_KEY,
  P24_METHOD_NAME_METADATA_KEY,
  PAYMENT_LABEL_METADATA_KEY,
  PRZELEWY24_PROVIDER_ID,
  readP24MethodIdFromSessionData,
  readP24MethodNameFromSessionData,
  resolveP24MethodName,
} from "./p24-payment-methods";
import { persistOrderCheckoutMetadata } from "./order-checkout-metadata";

type P24SessionRow = {
  provider_id?: string | null;
  status?: string | null;
  data?: Record<string, unknown> | null;
};

export type P24MetadataCopyResult =
  | "updated"
  | "skipped"
  | "no_p24"
  | "no_method";

function readP24SessionId(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  const raw = data.p24_session_id ?? data.sessionId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function resolveMethodFromSession(
  sessionData: Record<string, unknown>,
): Promise<{ methodId: number | null; methodName: string | null }> {
  let methodId = readP24MethodIdFromSessionData(sessionData);
  let methodName: string | null = readP24MethodNameFromSessionData(sessionData);

  const p24Config = loadP24ApiConfig();
  if (!methodId) {
    const sessionId = readP24SessionId(sessionData);
    if (sessionId && p24Config) {
      const tx = await fetchP24TransactionBySessionId(sessionId, p24Config);
      if (tx?.methodId && tx.methodId > 0) {
        methodId = tx.methodId;
      } else if (tx?.orderId && tx.orderId > 0) {
        const byOrder = await fetchP24TransactionByOrderId(tx.orderId, p24Config);
        if (byOrder?.methodId && byOrder.methodId > 0) {
          methodId = byOrder.methodId;
        }
      }
    }
  }

  if (!methodId) {
    const p24OrderId = Number(sessionData.order_id ?? sessionData.orderId);
    if (p24Config && Number.isFinite(p24OrderId) && p24OrderId > 0) {
      const tx = await fetchP24TransactionByOrderId(p24OrderId, p24Config);
      if (tx?.methodId && tx.methodId > 0) {
        methodId = tx.methodId;
      }
    }
  }

  if (!methodName && methodId && p24Config) {
    methodName = await resolveP24MethodName(methodId, p24Config);
  }

  return { methodId, methodName };
}

/**
 * Kopiuje szczegóły metody P24 (BLIK, bank, karta…) z sesji płatności
 * do metadata zamówienia — widoczne w panelu Magazyn.
 */
export async function copyP24PaymentDetailsToOrder(
  scope: MedusaContainer,
  orderId: string,
  options?: { force?: boolean },
): Promise<P24MetadataCopyResult> {
  if (!orderId.trim()) return "no_p24";

  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const orderObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: { id: orderId } },
    fields: [
      "id",
      "metadata",
      "payment_collections.payment_sessions.provider_id",
      "payment_collections.payment_sessions.status",
      "payment_collections.payment_sessions.data",
    ],
  });
  const rows = await remoteQuery(orderObject);
  const order = (Array.isArray(rows) ? rows[0] : rows) as
    | {
        metadata?: Record<string, unknown> | null;
        payment_collections?: Array<{
          payment_sessions?: P24SessionRow[] | null;
        }> | null;
      }
    | undefined;

  if (!order) return "no_p24";

  const existingMeta =
    order.metadata && typeof order.metadata === "object" ? order.metadata : {};
  if (
    !options?.force &&
    typeof existingMeta[PAYMENT_LABEL_METADATA_KEY] === "string" &&
    String(existingMeta[PAYMENT_LABEL_METADATA_KEY]).includes("(")
  ) {
    return "skipped";
  }

  const sessions =
    order.payment_collections?.flatMap((col) => col.payment_sessions ?? []) ?? [];
  let p24Session = sessions.find(
    (session) => session.provider_id === PRZELEWY24_PROVIDER_ID,
  );

  // Fallback: provider z payments gdy sesje nie są zlinkowane do order w query.
  if (!p24Session?.data) {
    const remoteQuery2 = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const payObject = remoteQueryObjectFromString({
      entryPoint: "order",
      variables: { filters: { id: orderId } },
      fields: [
        "payment_collections.id",
        "payment_collections.payments.provider_id",
      ],
    });
    const payRows = await remoteQuery2(payObject);
    const payOrder = (Array.isArray(payRows) ? payRows[0] : payRows) as
      | {
          payment_collections?: Array<{
            id?: string;
            payments?: Array<{ provider_id?: string | null }> | null;
          }> | null;
        }
      | undefined;
    const collectionId = payOrder?.payment_collections?.find((col) =>
      col.payments?.some((p) => p.provider_id === PRZELEWY24_PROVIDER_ID),
    )?.id;
    if (collectionId) {
      const sessionObject = remoteQueryObjectFromString({
        entryPoint: "payment_session",
        variables: {
          filters: {
            provider_id: PRZELEWY24_PROVIDER_ID,
            payment_collection_id: collectionId,
          },
        },
        fields: ["provider_id", "status", "data"],
      });
      const sessionRows = await remoteQuery2(sessionObject);
      const found = (Array.isArray(sessionRows) ? sessionRows[0] : sessionRows) as
        | P24SessionRow
        | undefined;
      if (found?.data) p24Session = found;
    }
  }

  if (!p24Session?.data) return "no_p24";

  const { methodId, methodName } = await resolveMethodFromSession(p24Session.data);

  if (!methodId && !methodName) return "no_method";

  const patch: Record<string, string> = {};
  if (methodId) patch[P24_METHOD_ID_METADATA_KEY] = String(methodId);
  if (methodName) {
    patch[P24_METHOD_NAME_METADATA_KEY] = methodName;
    patch[PAYMENT_LABEL_METADATA_KEY] = formatP24PaymentLabel(methodName);
  }

  if (Object.keys(patch).length === 0) return "no_method";
  await persistOrderCheckoutMetadata(scope, orderId, patch);
  return "updated";
}

/** Backfill metadata P24 dla wszystkich zamówień (CLI / jednorazowo). */
export async function backfillAllP24PaymentDetails(
  scope: MedusaContainer,
  options?: { force?: boolean; limit?: number },
): Promise<{
  total: number;
  updated: number;
  skipped: number;
  noP24: number;
  noMethod: number;
  failed: number;
}> {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const take = options?.limit ?? 10_000;
  const orderObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: {} },
    fields: ["id", "display_id"],
  });
  const rows = await remoteQuery(orderObject);
  const orders = (Array.isArray(rows) ? rows : rows ? [rows] : []) as Array<{
    id: string;
    display_id?: number | null;
  }>;

  const stats = {
    total: Math.min(orders.length, take),
    updated: 0,
    skipped: 0,
    noP24: 0,
    noMethod: 0,
    failed: 0,
  };

  for (const order of orders.slice(0, take)) {
    try {
      const result = await copyP24PaymentDetailsToOrder(scope, order.id, {
        force: options?.force,
      });
      if (result === "updated") stats.updated++;
      else if (result === "skipped") stats.skipped++;
      else if (result === "no_p24") stats.noP24++;
      else if (result === "no_method") stats.noMethod++;
    } catch {
      stats.failed++;
    }
  }

  return stats;
}
