import { describe, expect, it } from "vitest";
import {
  classifyCompleteCartError,
  isReconcilableSession,
  PRZELEWY24_PROVIDER_ID,
  RECONCILE_MIN_AGE_MS,
  RECONCILE_WINDOW_MS,
  uniqueCartIds,
} from "../p24-reconcile";

const now = Date.now();

describe("isReconcilableSession (P24)", () => {
  const base = {
    provider_id: PRZELEWY24_PROVIDER_ID,
    status: "pending",
    payment_collection_id: "pc_1",
    created_at: new Date(now - RECONCILE_MIN_AGE_MS - 60_000).toISOString(),
  };

  it("kwalifikuje pending sesję P24 starszą niż MIN_AGE w oknie", () => {
    expect(isReconcilableSession(base, now)).toBe(true);
  });

  it("odrzuca sesję innego providera", () => {
    expect(isReconcilableSession({ ...base, provider_id: "pp_other" }, now)).toBe(false);
  });

  it("odrzuca sesję nie-pending (już obsłużona)", () => {
    expect(isReconcilableSession({ ...base, status: "authorized" }, now)).toBe(false);
  });

  it("odrzuca świeżą sesję (klient może wciąż płacić)", () => {
    expect(
      isReconcilableSession({ ...base, created_at: new Date(now).toISOString() }, now),
    ).toBe(false);
  });

  it("odrzuca sesję starszą niż okno", () => {
    expect(
      isReconcilableSession(
        { ...base, created_at: new Date(now - RECONCILE_WINDOW_MS - 60_000).toISOString() },
        now,
      ),
    ).toBe(false);
  });

  it("odrzuca sesję bez payment_collection_id", () => {
    expect(isReconcilableSession({ ...base, payment_collection_id: null }, now)).toBe(false);
  });
});

describe("classifyCompleteCartError", () => {
  it("traktuje błąd autoryzacji jako payment_pending", () => {
    expect(
      classifyCompleteCartError({ type: "payment_authorization_error" }),
    ).toBe("payment_pending");
    expect(
      classifyCompleteCartError(new Error("Payment authorization failed")),
    ).toBe("payment_pending");
  });

  it("rozpoznaje already_completed", () => {
    expect(classifyCompleteCartError(new Error("Cart already completed"))).toBe(
      "already_completed",
    );
  });

  it("inne błędy jako error", () => {
    expect(classifyCompleteCartError(new Error("boom"))).toBe("error");
  });
});

describe("uniqueCartIds", () => {
  it("deduplikuje i odrzuca puste", () => {
    expect(
      uniqueCartIds([
        { cart_id: "c1" },
        { cart_id: "c1" },
        { cart_id: " " },
        { cart_id: "c2" },
        {},
      ]),
    ).toEqual(["c1", "c2"]);
  });
});
