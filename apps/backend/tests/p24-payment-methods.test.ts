import { describe, expect, it } from "vitest";
import {
  classifyP24Method,
  formatP24PaymentLabel,
  readP24MethodIdFromSessionData,
  readP24MethodNameFromSessionData,
} from "../src/lib/p24-payment-methods";

describe("classifyP24Method", () => {
  it("rozpoznaje BLIK / kartę / portfel", () => {
    expect(classifyP24Method("BLIK")).toBe("blik");
    expect(classifyP24Method("Karta płatnicza")).toBe("card");
    expect(classifyP24Method("Visa/Mastercard")).toBe("card");
    expect(classifyP24Method("Google Pay")).toBe("wallet");
    expect(classifyP24Method("Apple Pay")).toBe("wallet");
  });

  it("banki (pay-by-link) klasyfikuje jako przelew", () => {
    expect(classifyP24Method("mTransfer")).toBe("transfer");
    expect(classifyP24Method("Płacę z iPKO")).toBe("transfer");
    expect(classifyP24Method("ING Bank Śląski")).toBe("transfer");
  });
});

describe("formatP24PaymentLabel", () => {
  it("składa etykietę z nazwą metody", () => {
    expect(formatP24PaymentLabel("BLIK")).toBe("Przelewy24 (BLIK)");
  });

  it("przelew bankowy oznacza jawnie jako przelew (wymóg Magazynu)", () => {
    expect(formatP24PaymentLabel("mTransfer")).toBe(
      "Przelewy24 (przelew — mTransfer)",
    );
    expect(formatP24PaymentLabel("Płacę z iPKO")).toBe(
      "Przelewy24 (przelew — Płacę z iPKO)",
    );
  });

  it("fallback bez nazwy", () => {
    expect(formatP24PaymentLabel("")).toBe("Przelewy24");
    expect(formatP24PaymentLabel("   ")).toBe("Przelewy24");
  });
});

describe("readP24MethodFromSessionData", () => {
  it("czyta p24_method_id i p24_method_name", () => {
    expect(
      readP24MethodIdFromSessionData({ p24_method_id: 181 }),
    ).toBe(181);
    expect(
      readP24MethodNameFromSessionData({ p24_method_name: "BLIK" }),
    ).toBe("BLIK");
  });

  it("ignoruje niepoprawne wartości", () => {
    expect(readP24MethodIdFromSessionData({ p24_method_id: 0 })).toBeNull();
    expect(readP24MethodNameFromSessionData({ p24_method_name: "  " })).toBeNull();
  });
});
