import { describe, expect, it } from "vitest";
import {
  computeExpressFeePln,
  EXPRESS_FEE_SHIPPING_METHOD_NAME,
  planExpressFeeReconcile,
} from "../src/lib/express-fee";

const FEE = EXPRESS_FEE_SHIPPING_METHOD_NAME;

describe("computeExpressFeePln", () => {
  it("liczy 50% sumy pozycji z zaokrągleniem do grosza", () => {
    expect(computeExpressFeePln(99.9)).toBe(49.95);
    expect(computeExpressFeePln(199.8)).toBe(99.9);
    expect(computeExpressFeePln(0.03)).toBe(0.02); // 0.015 → zaokrąglenie
  });

  it("zwraca 0 dla pustego/ujemnego/nienumerycznego subtotalu", () => {
    expect(computeExpressFeePln(0)).toBe(0);
    expect(computeExpressFeePln(-10)).toBe(0);
    expect(computeExpressFeePln(Number.NaN)).toBe(0);
  });
});

describe("planExpressFeeReconcile", () => {
  it("express OFF bez metody-dopłaty → brak zmian", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: false,
      itemSubtotal: 100,
      methods: [{ id: "sm_kurier", name: "Kurier DPD", amount: 25 }],
    });
    expect(plan).toEqual({ deleteIds: [], addAmount: null, changed: false });
  });

  it("express OFF z metodą-dopłatą → usuwa ją", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: false,
      itemSubtotal: 100,
      methods: [
        { id: "sm_kurier", name: "Kurier DPD", amount: 25 },
        { id: "sm_fee", name: FEE, amount: 50 },
      ],
    });
    expect(plan).toEqual({ deleteIds: ["sm_fee"], addAmount: null, changed: true });
  });

  it("express ON bez metody-dopłaty → dodaje 50% pozycji", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: true,
      itemSubtotal: 99.9,
      methods: [{ id: "sm_kurier", name: "Kurier DPD", amount: 25 }],
    });
    expect(plan).toEqual({ deleteIds: [], addAmount: 49.95, changed: true });
  });

  it("express ON z poprawną metodą-dopłatą → idempotentny no-op", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: true,
      itemSubtotal: 99.9,
      methods: [
        { id: "sm_kurier", name: "Kurier DPD", amount: 25 },
        { id: "sm_fee", name: FEE, amount: 49.95 },
      ],
    });
    expect(plan).toEqual({ deleteIds: [], addAmount: null, changed: false });
  });

  it("express ON ze złą kwotą dopłaty (zmiana koszyka) → wymienia metodę", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: true,
      itemSubtotal: 199.8,
      methods: [{ id: "sm_fee", name: FEE, amount: 49.95 }],
    });
    expect(plan).toEqual({ deleteIds: ["sm_fee"], addAmount: 99.9, changed: true });
  });

  it("duplikaty metod-dopłat → kasuje wszystkie i dodaje jedną", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: true,
      itemSubtotal: 100,
      methods: [
        { id: "sm_fee1", name: FEE, amount: 50 },
        { id: "sm_fee2", name: FEE, amount: 50 },
      ],
    });
    expect(plan).toEqual({
      deleteIds: ["sm_fee1", "sm_fee2"],
      addAmount: 50,
      changed: true,
    });
  });

  it("toleruje kwoty jako stringi (numeric z Postgresa)", () => {
    const plan = planExpressFeeReconcile({
      expressDelivery: true,
      itemSubtotal: 100,
      methods: [{ id: "sm_fee", name: FEE, amount: "50.00" }],
    });
    expect(plan.changed).toBe(false);
  });
});
