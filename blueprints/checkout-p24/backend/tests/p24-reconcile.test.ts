import { describe, expect, it } from "vitest";
import {
  classifyAuthorizeSessionError,
  classifyCompleteCartError,
  isReconcilableSession,
  isRecoverablePaymentCollectionStatus,
  mapCollectionsToOrders,
  pendingSessionIdsForCollections,
  PRZELEWY24_PROVIDER_ID,
  RECONCILE_MIN_AGE_MS,
  RECONCILE_WINDOW_MS,
  uniqueCartIds,
  type P24SessionRow,
} from "../src/lib/p24-reconcile";

const NOW = Date.parse("2026-06-10T12:00:00Z");

function sessionAgedMs(ageMs: number, overrides: Record<string, unknown> = {}) {
  return {
    id: "payses_1",
    provider_id: PRZELEWY24_PROVIDER_ID,
    status: "pending",
    created_at: new Date(NOW - ageMs).toISOString(),
    payment_collection_id: "paycol_1",
    ...overrides,
  };
}

describe("isReconcilableSession", () => {
  it("kwalifikuje wiszącą sesję P24 w oknie rekoncyliacji", () => {
    expect(isReconcilableSession(sessionAgedMs(60 * 60 * 1000), NOW)).toBe(true);
  });

  it("pomija świeże sesje (klient może właśnie płacić)", () => {
    expect(
      isReconcilableSession(sessionAgedMs(RECONCILE_MIN_AGE_MS - 1000), NOW),
    ).toBe(false);
  });

  it("kwalifikuje sesję dokładnie na granicy minimalnego wieku", () => {
    expect(
      isReconcilableSession(sessionAgedMs(RECONCILE_MIN_AGE_MS), NOW),
    ).toBe(true);
  });

  it("pomija sesje starsze niż okno (transakcja P24 wygasła)", () => {
    expect(
      isReconcilableSession(sessionAgedMs(RECONCILE_WINDOW_MS + 60_000), NOW),
    ).toBe(false);
  });

  it("pomija innych providerów (przelew tradycyjny pp_system_default)", () => {
    expect(
      isReconcilableSession(
        sessionAgedMs(60 * 60 * 1000, { provider_id: "pp_system_default" }),
        NOW,
      ),
    ).toBe(false);
  });

  it("pomija sesje już autoryzowane (obsłużyła je Medusa)", () => {
    expect(
      isReconcilableSession(
        sessionAgedMs(60 * 60 * 1000, { status: "authorized" }),
        NOW,
      ),
    ).toBe(false);
  });

  it("pomija sesje bez payment_collection_id", () => {
    expect(
      isReconcilableSession(
        sessionAgedMs(60 * 60 * 1000, { payment_collection_id: null }),
        NOW,
      ),
    ).toBe(false);
  });

  it("pomija sesje z uszkodzonym created_at", () => {
    expect(
      isReconcilableSession(
        sessionAgedMs(0, { created_at: "not-a-date" }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isReconcilableSession(sessionAgedMs(0, { created_at: null }), NOW),
    ).toBe(false);
  });
});

describe("classifyCompleteCartError", () => {
  it("rozpoznaje nieopłaconą płatność po typie MedusaError", () => {
    expect(
      classifyCompleteCartError({
        type: "payment_authorization_error",
        message: "Payment authorization failed",
      }),
    ).toBe("payment_pending");
  });

  it("rozpoznaje nieopłaconą płatność po komunikacie", () => {
    expect(
      classifyCompleteCartError(new Error("Payment authorization failed")),
    ).toBe("payment_pending");
  });

  it("rozpoznaje requires_more jako oczekującą płatność", () => {
    expect(
      classifyCompleteCartError({
        type: "payment_requires_more_error",
        message: "More information is required for payment",
      }),
    ).toBe("payment_pending");
  });

  it("rozpoznaje wyścig — koszyk już domknięty przez storefront/webhook", () => {
    expect(
      classifyCompleteCartError(new Error("Cart is already completed.")),
    ).toBe("already_completed");
  });

  it("każdy inny błąd traktuje jako realny problem", () => {
    expect(classifyCompleteCartError(new Error("ECONNREFUSED"))).toBe("error");
    expect(classifyCompleteCartError(undefined)).toBe("error");
  });
});

describe("uniqueCartIds", () => {
  it("deduplikuje i odsiewa puste cart_id", () => {
    expect(
      uniqueCartIds([
        { cart_id: "cart_1" },
        { cart_id: "cart_1" },
        { cart_id: "  " },
        { cart_id: null },
        { cart_id: "cart_2" },
      ]),
    ).toEqual(["cart_1", "cart_2"]);
  });
});

describe("isRecoverablePaymentCollectionStatus", () => {
  it("kwalifikuje nierozliczoną kolekcję do odzyskania", () => {
    expect(isRecoverablePaymentCollectionStatus("not_paid")).toBe(true);
    expect(isRecoverablePaymentCollectionStatus("awaiting")).toBe(true);
    expect(isRecoverablePaymentCollectionStatus("authorized")).toBe(true);
    expect(isRecoverablePaymentCollectionStatus("failed")).toBe(true);
  });

  it("nieznany/pusty status traktuje jako odzyskiwalny (authorize jest idempotentne)", () => {
    expect(isRecoverablePaymentCollectionStatus(null)).toBe(true);
    expect(isRecoverablePaymentCollectionStatus(undefined)).toBe(true);
    expect(isRecoverablePaymentCollectionStatus("")).toBe(true);
  });

  it("pomija kolekcje rozliczone i anulowane", () => {
    expect(isRecoverablePaymentCollectionStatus("completed")).toBe(false);
    expect(isRecoverablePaymentCollectionStatus("canceled")).toBe(false);
  });
});

describe("mapCollectionsToOrders", () => {
  it("mapuje payment_collection → order_id i odsiewa niepełne wiersze", () => {
    const map = mapCollectionsToOrders([
      { payment_collection_id: "paycol_1", order_id: "order_1" },
      { payment_collection_id: "  ", order_id: "order_x" },
      { payment_collection_id: "paycol_2", order_id: null },
      { payment_collection_id: "paycol_3", order_id: "order_3" },
    ]);
    expect([...map.entries()]).toEqual([
      ["paycol_1", "order_1"],
      ["paycol_3", "order_3"],
    ]);
  });
});

describe("pendingSessionIdsForCollections", () => {
  const sessions: P24SessionRow[] = [
    { id: "payses_1", payment_collection_id: "paycol_1" },
    { id: "payses_2", payment_collection_id: "paycol_2" },
    { id: "payses_3", payment_collection_id: "paycol_1" },
    { id: "", payment_collection_id: "paycol_1" },
    { id: "payses_4", payment_collection_id: null },
  ];

  it("zwraca id sesji należących do wskazanych kolekcji", () => {
    expect(pendingSessionIdsForCollections(sessions, ["paycol_1"])).toEqual([
      "payses_1",
      "payses_3",
    ]);
  });

  it("obsługuje wiele kolekcji i pomija puste id / brak kolekcji", () => {
    expect(
      pendingSessionIdsForCollections(sessions, ["paycol_1", "paycol_2"]),
    ).toEqual(["payses_1", "payses_2", "payses_3"]);
  });

  it("zwraca pustą listę gdy brak dopasowania", () => {
    expect(pendingSessionIdsForCollections(sessions, ["paycol_9"])).toEqual([]);
  });
});

describe("classifyAuthorizeSessionError", () => {
  it("rozpoznaje brak wpłaty (NOT_ALLOWED / was not authorized)", () => {
    expect(
      classifyAuthorizeSessionError({
        type: "not_allowed",
        message: "Session: payses_1 was not authorized with the provider.",
      }),
    ).toBe("not_paid_yet");
    expect(
      classifyAuthorizeSessionError(new Error("Payment authorization failed")),
    ).toBe("not_paid_yet");
  });

  it("rozpoznaje wyścig — sesja już zautoryzowana", () => {
    expect(
      classifyAuthorizeSessionError(new Error("Session already authorized")),
    ).toBe("already_settled");
  });

  it("każdy inny błąd traktuje jako realny problem", () => {
    expect(classifyAuthorizeSessionError(new Error("ECONNREFUSED"))).toBe("error");
    expect(classifyAuthorizeSessionError(undefined)).toBe("error");
  });
});
