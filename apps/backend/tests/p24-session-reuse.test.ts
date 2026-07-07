import { describe, expect, it } from "vitest";
import {
  p24SessionAmountMatches,
  p24SessionIdFromData,
  planP24SessionForCheckout,
} from "../src/lib/p24-session-reuse";

describe("p24SessionAmountMatches", () => {
  it("kwoty równe w tolerancji pół grosza → true", () => {
    expect(p24SessionAmountMatches(124.9, 124.9)).toBe(true);
    expect(p24SessionAmountMatches("124.90", 124.902)).toBe(true);
  });

  it("realny rozjazd kwot → false", () => {
    expect(p24SessionAmountMatches(124.9, 174.85)).toBe(false);
    expect(p24SessionAmountMatches(124.9, 124.91)).toBe(false);
  });

  it("brak którejkolwiek kwoty → true (nie niszczymy sesji po niepełnych danych)", () => {
    expect(p24SessionAmountMatches(null, 124.9)).toBe(true);
    expect(p24SessionAmountMatches(124.9, undefined)).toBe(true);
    expect(p24SessionAmountMatches("abc", 124.9)).toBe(true);
  });
});

describe("planP24SessionForCheckout", () => {
  it("brak sesji → create", () => {
    expect(
      planP24SessionForCheckout({ session: null, collectionAmount: 124.9 }),
    ).toBe("create");
  });

  it("sesja pending na zgodną kwotę → reuse (idempotencja: jeden redirect, jedna transakcja)", () => {
    expect(
      planP24SessionForCheckout({
        session: { status: "pending", amount: 124.9 },
        collectionAmount: 124.9,
      }),
    ).toBe("reuse");
  });

  it("sesja pending na inną kwotę (zmiana koszyka po rejestracji) → recreate", () => {
    expect(
      planP24SessionForCheckout({
        session: { status: "pending", amount: 124.9 },
        collectionAmount: 174.85,
      }),
    ).toBe("recreate");
  });

  it("sesja authorized/captured → reuse (nie wolno kasować rozliczanej sesji)", () => {
    expect(
      planP24SessionForCheckout({
        session: { status: "authorized", amount: 124.9 },
        collectionAmount: 174.85,
      }),
    ).toBe("reuse");
    expect(
      planP24SessionForCheckout({
        session: { status: "captured", amount: 124.9 },
        collectionAmount: 174.85,
      }),
    ).toBe("reuse");
  });

  it("brak statusu traktuje jako pending", () => {
    expect(
      planP24SessionForCheckout({
        session: { amount: 100 },
        collectionAmount: 200,
      }),
    ).toBe("recreate");
  });
});

describe("p24SessionIdFromData", () => {
  it("wyciąga p24_session_id", () => {
    expect(p24SessionIdFromData({ p24_session_id: "p24_abc" })).toBe("p24_abc");
  });

  it("brak/pusty/nie-string → null", () => {
    expect(p24SessionIdFromData(null)).toBe(null);
    expect(p24SessionIdFromData({})).toBe(null);
    expect(p24SessionIdFromData({ p24_session_id: "  " })).toBe(null);
    expect(p24SessionIdFromData({ p24_session_id: 42 })).toBe(null);
  });
});
