import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { alertOrderWithoutPayment } from "./checkout-audit";
import {
  fetchP24TransactionBySessionId,
  loadP24ApiConfig,
} from "./p24-transaction-api";
import { captureError, captureMessage } from "./sentry";
import {
  classifyAuthorizeSessionError,
  classifyCompleteCartError,
  isReconcilableSession,
  isRecoverablePaymentCollectionStatus,
  mapCollectionsToOrders,
  pendingSessionIdsForCollections,
  PRZELEWY24_PROVIDER_ID,
  RECONCILE_MAX_PER_RUN,
  uniqueCartIds,
  type P24SessionRow,
} from "./p24-reconcile";

type QueryGraph = {
  graph: (q: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
    pagination?: {
      skip?: number;
      take?: number;
      order?: Record<string, "ASC" | "DESC">;
    };
  }) => Promise<{ data: unknown[] }>;
};

export type ReconcileLogger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

export type P24ReconcileResult = {
  /** Liczba sprawdzonych koszyków z wiszącą sesją P24. */
  candidates: number;
  /** Liczba domkniętych koszyków (utworzonych zamówień). */
  completed: number;
  /**
   * Liczba OSIEROCONYCH zamówień domkniętych w tym przebiegu — zamówienie już
   * istniało (koszyk domknięty), ale płatność P24 nie została potwierdzona.
   */
  settled: number;
  /** ID zamówień odzyskanych w tym przebiegu (do dispatchu maili w server mode). */
  recoveredOrderIds: string[];
};

type QueryGraphContainer = {
  graph: QueryGraph["graph"];
};

/**
 * Odzyskuje OSIEROCONE zamówienia P24 — zamówienie POWSTAŁO (koszyk domknięty),
 * ale środki nie zostały potwierdzone: `payment_status=not_paid`, a sesja P24
 * wisi w `pending`. Przyczyna: zgubiony webhook `urlStatus` lub nieudany
 * `transaction/verify` w chwili domknięcia koszyka. Cart-sweep tego NIE łapie,
 * bo filtruje `!completed_at` (te koszyki są już domknięte).
 *
 * Dla każdej takiej sesji wołamy `paymentModule.authorizePaymentSession`, co
 * uruchamia providera P24 (`authorizePayment` → `confirmFromP24` →
 * `transaction/verify`). Gdy środki są w P24 — sesja przechodzi w `captured`,
 * Medusa tworzy Payment i domyka kolekcję (`payment_status` → `captured`).
 * Gdy środków brak — provider zwraca `pending`, Medusa rzuca NOT_ALLOWED
 * (pomijamy po cichu). Operacja jest idempotentna.
 */
async function recoverOrphanedP24Orders(
  container: MedusaContainer,
  logger: ReconcileLogger,
  reconcilableSessions: P24SessionRow[],
): Promise<string[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphContainer;

  const collectionIds = [
    ...new Set(
      reconcilableSessions
        .map((row) => row.payment_collection_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (collectionIds.length === 0) return [];

  // Kolekcje powiązane z ZAMÓWIENIEM (link istnieje ⇒ koszyk domknięty).
  const { data: orderLinkRows } = await query.graph({
    entity: "order_payment_collection",
    fields: ["order_id", "payment_collection_id"],
    filters: { payment_collection_id: collectionIds },
    pagination: { take: collectionIds.length },
  });
  const collectionToOrder = mapCollectionsToOrders(
    orderLinkRows as Array<{ order_id?: string | null; payment_collection_id?: string | null }>,
  );
  if (collectionToOrder.size === 0) return [];

  // Pomijamy zamówienia anulowane (order.status to realna kolumna).
  const orderIds = [...new Set(collectionToOrder.values())];
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "status"],
    filters: { id: orderIds },
    pagination: { take: orderIds.length },
  });
  const recoverableOrderIds = new Set(
    (orderRows as Array<{ id: string; status?: string | null }>)
      .filter((o) => o.status !== "canceled")
      .map((o) => o.id),
  );
  if (recoverableOrderIds.size === 0) return [];

  // Pomijamy kolekcje już rozliczone/anulowane — klasyfikacja po
  // payment_collection.status, NIE po order.payment_status (patrz komentarz
  // przy isRecoverablePaymentCollectionStatus).
  const linkedCollectionIds = [...collectionToOrder.keys()];
  const { data: collectionRows } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "status"],
    filters: { id: linkedCollectionIds },
    pagination: { take: linkedCollectionIds.length },
  });
  const collectionStatusById = new Map(
    (collectionRows as Array<{ id: string; status?: string | null }>).map(
      (c) => [c.id, c.status] as const,
    ),
  );

  const recoverableCollectionIds = [...collectionToOrder.entries()]
    .filter(
      ([collectionId, orderId]) =>
        recoverableOrderIds.has(orderId) &&
        isRecoverablePaymentCollectionStatus(collectionStatusById.get(collectionId)),
    )
    .map(([collectionId]) => collectionId);

  const sessionIds = pendingSessionIdsForCollections(
    reconcilableSessions,
    recoverableCollectionIds,
  ).slice(0, RECONCILE_MAX_PER_RUN);
  if (sessionIds.length === 0) return [];

  const sessionToOrder = new Map<string, string>();
  for (const s of reconcilableSessions) {
    const sid = s.id?.trim();
    const cid = s.payment_collection_id?.trim();
    if (sid && cid && collectionToOrder.has(cid)) {
      sessionToOrder.set(sid, collectionToOrder.get(cid) as string);
    }
  }

  logger.info(
    `[p24-reconcile] sprawdzam ${sessionIds.length} osieroconych zamówień z wiszącą sesją P24`,
  );

  const paymentModule = container.resolve(Modules.PAYMENT);
  const settledOrderIds: string[] = [];

  const sessionRowById = new Map<string, P24SessionRow>();
  for (const s of reconcilableSessions) {
    if (s.id?.trim()) sessionRowById.set(s.id.trim(), s);
  }

  for (const sessionId of sessionIds) {
    try {
      await paymentModule.authorizePaymentSession(sessionId, {});
      const orderId = sessionToOrder.get(sessionId);
      if (orderId) settledOrderIds.push(orderId);
      logger.info(
        `[p24-reconcile] zamówienie ${orderId ?? "?"} domknięte przez authorizePaymentSession (sesja ${sessionId} — środki potwierdzone w P24)`,
      );
    } catch (e) {
      const kind = classifyAuthorizeSessionError(e);
      if (kind === "not_paid_yet") {
        // TRIPWIRE (klasa #10165): zamówienie istnieje, a P24 nie zna tej
        // transakcji — to nie jest „spóźniona wpłata”, tylko zamówienie,
        // które nigdy nie powinno było powstać. Alarmujemy raz na dobę.
        await flagOrderWithoutP24Transaction(
          logger,
          sessionRowById.get(sessionId),
          sessionToOrder.get(sessionId),
        );
        continue;
      }
      if (kind === "already_settled") {
        continue; // wyścig z webhookiem/klientem — normalny stan
      }
      logger.warn(
        `[p24-reconcile] sesja ${sessionId}: ${(e as Error)?.message ?? e}`,
      );
      captureError(e, { job: "reconcile-p24-payments", session_id: sessionId });
    }
  }

  return settledOrderIds;
}

/** Dedup alertów tripwire — max 1 alert / zamówienie / 24h per proces. */
const orderWithoutPaymentAlertedAt = new Map<string, number>();
const TRIPWIRE_ALERT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Sprawdza w P24, czy dla wiszącej sesji osieroconego zamówienia w ogóle
 * istnieje transakcja. Brak transakcji (404) = zamówienie powstało bez
 * płatności (przerwana kompensacja completeCart) → alert Sentry + audit log.
 */
async function flagOrderWithoutP24Transaction(
  logger: ReconcileLogger,
  sessionRow: P24SessionRow | undefined,
  orderId: string | undefined,
): Promise<void> {
  if (!orderId) return;

  const lastAlert = orderWithoutPaymentAlertedAt.get(orderId);
  if (lastAlert && Date.now() - lastAlert < TRIPWIRE_ALERT_TTL_MS) return;

  const p24Config = loadP24ApiConfig();
  const p24SessionId =
    typeof sessionRow?.data?.p24_session_id === "string"
      ? sessionRow.data.p24_session_id
      : null;
  if (!p24Config || !p24SessionId) return;

  const tx = await fetchP24TransactionBySessionId(p24SessionId, p24Config);
  // Transakcja istnieje (status 0 = zarejestrowana, nieopłacona) — klient
  // po prostu jeszcze nie zapłacił. Alarmujemy tylko gdy P24 jej NIE ZNA.
  if (tx) return;

  orderWithoutPaymentAlertedAt.set(orderId, Date.now());
  alertOrderWithoutPayment(logger, {
    order_id: orderId,
    payment_status: "not_paid",
    provider_ids: [sessionRow?.provider_id ?? "?"],
    session_statuses: [sessionRow?.status ?? "?"],
  });
}

/**
 * Rdzeń rekoncyliacji Przelewy24 — współdzielony przez scheduled job
 * (`jobs/reconcile-p24-payments`) i endpoint HTTP (`/store/custom/reconcile-p24`).
 *
 * Endpoint to siatka bezpieczeństwa niezależna od trybu workera Medusy: na
 * pojedynczej instancji w `MEDUSA_WORKER_MODE=server` scheduled jobs nie chodzą,
 * więc wiszące płatności P24 (klient zamknął przeglądarkę po wpłacie) nigdy nie
 * domykały się same. Zewnętrzny cron (Vercel) wołający endpoint to standard
 * branżowy (cron-job → HTTP).
 *
 * Zamówienie powstaje WYŁĄCZNIE gdy provider P24 potwierdzi środki
 * (`completeCartWorkflow` → authorizePayment → pull-based `transaction/verify`).
 * Nieopłacone sesje kończą się `PAYMENT_AUTHORIZATION_ERROR` (po cichu pomijane).
 */
export async function runP24Reconcile(
  container: MedusaContainer,
  logger: ReconcileLogger,
): Promise<P24ReconcileResult> {
  const empty: P24ReconcileResult = {
    candidates: 0,
    completed: 0,
    settled: 0,
    recoveredOrderIds: [],
  };

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph;

  // 1. Wiszące sesje P24 (pending = klient był na bramce, brak potwierdzenia).
  const { data: sessionRows } = await query.graph({
    entity: "payment_session",
    fields: [
      "id",
      "status",
      "provider_id",
      "created_at",
      "payment_collection_id",
      "data",
    ],
    filters: { provider_id: PRZELEWY24_PROVIDER_ID, status: "pending" },
    pagination: { take: 500, order: { created_at: "DESC" } },
  });

  const now = Date.now();
  const reconcilable = (sessionRows as P24SessionRow[]).filter((row) =>
    isReconcilableSession(row, now),
  );
  if (reconcilable.length === 0) return empty;

  // 2. Odzyskaj OSIEROCONE zamówienia (zamówienie istnieje, ale płatność P24
  //    nie została potwierdzona). Niezależne od cart-sweep — te koszyki są już
  //    domknięte, więc `completeCartWorkflow` ich nie tknie.
  const settledOrderIds = await recoverOrphanedP24Orders(
    container,
    logger,
    reconcilable,
  );

  // 3. Osierocone KOSZYKI (jeszcze niedomknięte) — sesja → koszyk (link).
  const collectionIds = [
    ...new Set(
      reconcilable
        .map((row) => row.payment_collection_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: linkRows } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["cart_id", "payment_collection_id"],
    filters: { payment_collection_id: collectionIds },
    pagination: { take: collectionIds.length },
  });
  const cartIds = uniqueCartIds(linkRows as Array<{ cart_id?: string | null }>);

  // cart_id → wiszące sesje P24 (do domknięcia płatności zaraz po completeCart).
  const cartToSessionIds = new Map<string, string[]>();
  for (const link of linkRows as Array<{
    cart_id?: string | null;
    payment_collection_id?: string | null;
  }>) {
    const cartId = link.cart_id?.trim();
    const collectionId = link.payment_collection_id?.trim();
    if (!cartId || !collectionId) continue;
    const sessionIds = pendingSessionIdsForCollections(reconcilable, [collectionId]);
    if (sessionIds.length > 0) {
      cartToSessionIds.set(cartId, [
        ...(cartToSessionIds.get(cartId) ?? []),
        ...sessionIds,
      ]);
    }
  }

  const recoveredOrderIds: string[] = [];
  let candidatesCount = 0;

  if (cartIds.length > 0) {
    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["id", "completed_at"],
      filters: { id: cartIds },
      pagination: { take: cartIds.length },
    });
    const candidates = (cartRows as Array<{ id: string; completed_at?: string | null }>)
      .filter((c) => !c.completed_at)
      .slice(0, RECONCILE_MAX_PER_RUN);
    candidatesCount = candidates.length;

    if (candidates.length > 0) {
      logger.info(
        `[p24-reconcile] sprawdzam ${candidates.length} koszyków z wiszącą sesją P24`,
      );

      // Sekwencyjnie (nie równolegle) — oszczędza P24 API i workflow engine.
      const paymentModule = container.resolve(Modules.PAYMENT);
      for (const cart of candidates) {
        try {
          const { result } = await completeCartWorkflow(container).run({
            input: { id: cart.id },
          });
          // Workflow (store:true) potrafi zwrócić ZANIM silnik wykona końcowe
          // kroki (w tym autoryzację płatności) — incydent #10169: zamówienie
          // powstało, result.id było puste, sesja została pending. Dlatego
          // płatność domykamy tu JAWNIE (idempotentnie), nie licząc na ogon
          // workflow ani na kolejny przebieg crona.
          const createdOrderId = (result as { id?: string } | undefined)?.id;
          for (const sessionId of cartToSessionIds.get(cart.id) ?? []) {
            try {
              await paymentModule.authorizePaymentSession(sessionId, {});
            } catch (authorizeError) {
              const kind = classifyAuthorizeSessionError(authorizeError);
              if (kind === "error") {
                logger.warn(
                  `[p24-reconcile] sesja ${sessionId} po domknięciu koszyka ${cart.id}: ${(authorizeError as Error)?.message ?? authorizeError}`,
                );
                captureError(authorizeError, {
                  job: "reconcile-p24-payments",
                  cart_id: cart.id,
                  session_id: sessionId,
                });
              }
            }
          }

          // Gdy workflow nie zwrócił id (ogon async), zamówienie i tak już
          // istnieje — bierzemy je z linku order_cart, żeby wysłać maile.
          let orderId = createdOrderId;
          if (!orderId) {
            const { data: orderCartRows } = await query.graph({
              entity: "order_cart",
              fields: ["order_id", "cart_id"],
              filters: { cart_id: cart.id },
              pagination: { take: 1 },
            });
            orderId = (orderCartRows as Array<{ order_id?: string | null }>)[0]
              ?.order_id?.trim() || undefined;
          }
          if (orderId) recoveredOrderIds.push(orderId);
          logger.info(
            `[p24-reconcile] koszyk ${cart.id} domknięty → zamówienie ${orderId ?? "(id nieznane — silnik workflow dokańcza asynchronicznie)"}`,
          );
        } catch (e) {
          const kind = classifyCompleteCartError(e);
          if (kind === "payment_pending" || kind === "already_completed") {
            continue; // normalny stan — wpłata jeszcze nie dotarła / ktoś nas ubiegł
          }
          logger.warn(`[p24-reconcile] koszyk ${cart.id}: ${(e as Error)?.message ?? e}`);
          captureError(e, { job: "reconcile-p24-payments", cart_id: cart.id });
        }
      }
    }
  }

  const allRecovered = [...settledOrderIds, ...recoveredOrderIds];
  if (allRecovered.length > 0) {
    logger.info(
      `[p24-reconcile] odzyskano ${allRecovered.length} zamówień (${settledOrderIds.length} osieroconych + ${recoveredOrderIds.length} z koszyków)`,
    );
    // Alert: płatność prawie zginęła cicho (webhook zgubiony / klient zamknął
    // stronę powrotu). Reconcile ją odratował — chcemy o tym wiedzieć, bo to
    // sygnał problemu z webhookiem/return flow, nie normalny stan.
    captureMessage(
      `[p24-reconcile] odratowano ${allRecovered.length} osieroconych płatności P24`,
      "warning",
      {
        job: "reconcile-p24-payments",
        recovered_count: allRecovered.length,
        settled_order_count: settledOrderIds.length,
        completed_cart_count: recoveredOrderIds.length,
        recovered_order_ids: allRecovered,
      },
    );
  }

  return {
    candidates: candidatesCount,
    completed: recoveredOrderIds.length,
    settled: settledOrderIds.length,
    recoveredOrderIds: allRecovered,
  };
}
