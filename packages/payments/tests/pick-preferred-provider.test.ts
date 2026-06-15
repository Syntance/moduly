import { describe, expect, it } from "vitest";
import {
	isProductionProvider,
	pickPreferredProvider,
	PRZELEWY24_PROVIDER_ID,
	STRIPE_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
	TPAY_PROVIDER_ID,
} from "../src/providers";

describe("pickPreferredProvider — ADR 002 priorytet", () => {
	it("preferuje P24 gdy wszystkie providery dostępne", () => {
		const id = pickPreferredProvider([
			{ id: SYSTEM_PAYMENT_PROVIDER_ID },
			{ id: TPAY_PROVIDER_ID },
			{ id: STRIPE_PROVIDER_ID },
			{ id: PRZELEWY24_PROVIDER_ID },
		]);
		expect(id).toBe(PRZELEWY24_PROVIDER_ID);
	});

	it("preferuje Stripe gdy brak P24", () => {
		const id = pickPreferredProvider([
			{ id: SYSTEM_PAYMENT_PROVIDER_ID },
			{ id: TPAY_PROVIDER_ID },
			{ id: STRIPE_PROVIDER_ID },
		]);
		expect(id).toBe(STRIPE_PROVIDER_ID);
	});

	it("preferuje tpay gdy brak P24 i Stripe", () => {
		const id = pickPreferredProvider([
			{ id: SYSTEM_PAYMENT_PROVIDER_ID },
			{ id: TPAY_PROVIDER_ID },
		]);
		expect(id).toBe(TPAY_PROVIDER_ID);
	});

	it("używa manual (system) gdy brak providerów produkcyjnych", () => {
		const id = pickPreferredProvider([{ id: SYSTEM_PAYMENT_PROVIDER_ID }]);
		expect(id).toBe(SYSTEM_PAYMENT_PROVIDER_ID);
	});

	it("manual jest po produkcyjnych — nie wygrywa gdy jest P24", () => {
		const id = pickPreferredProvider([
			{ id: SYSTEM_PAYMENT_PROVIDER_ID },
			{ id: PRZELEWY24_PROVIDER_ID },
		]);
		expect(id).toBe(PRZELEWY24_PROVIDER_ID);
	});

	it("wybiera pierwszy dostępny gdy brak znanych providerów", () => {
		const id = pickPreferredProvider([
			{ id: "pp_paypal_paypal" },
			{ id: "pp_klarna_klarna" },
		]);
		expect(id).toBe("pp_paypal_paypal");
	});

	it("zwraca undefined dla pustej listy", () => {
		expect(pickPreferredProvider([])).toBeUndefined();
	});
});

describe("pickPreferredProvider — kombinacje ENV / dostępności", () => {
	const scenarios: Array<{
		name: string;
		providers: string[];
		expected: string | undefined;
	}> = [
		{
			name: "prod: P24 + Stripe + tpay + manual",
			providers: [
				PRZELEWY24_PROVIDER_ID,
				STRIPE_PROVIDER_ID,
				TPAY_PROVIDER_ID,
				SYSTEM_PAYMENT_PROVIDER_ID,
			],
			expected: PRZELEWY24_PROVIDER_ID,
		},
		{
			name: "prod bez P24: Stripe + tpay + manual",
			providers: [STRIPE_PROVIDER_ID, TPAY_PROVIDER_ID, SYSTEM_PAYMENT_PROVIDER_ID],
			expected: STRIPE_PROVIDER_ID,
		},
		{
			name: "prod bez P24/Stripe: tpay + manual",
			providers: [TPAY_PROVIDER_ID, SYSTEM_PAYMENT_PROVIDER_ID],
			expected: TPAY_PROVIDER_ID,
		},
		{
			name: "dev/test: tylko manual",
			providers: [SYSTEM_PAYMENT_PROVIDER_ID],
			expected: SYSTEM_PAYMENT_PROVIDER_ID,
		},
		{
			name: "staging: Stripe + manual (P24 wyłączone ENV)",
			providers: [STRIPE_PROVIDER_ID, SYSTEM_PAYMENT_PROVIDER_ID],
			expected: STRIPE_PROVIDER_ID,
		},
		{
			name: "staging: tpay + manual",
			providers: [TPAY_PROVIDER_ID, SYSTEM_PAYMENT_PROVIDER_ID],
			expected: TPAY_PROVIDER_ID,
		},
		{
			name: "legacy: nieznany provider",
			providers: ["pp_legacy_gateway"],
			expected: "pp_legacy_gateway",
		},
		{
			name: "pusta konfiguracja regionu",
			providers: [],
			expected: undefined,
		},
	];

	it.each(scenarios)("$name", ({ providers, expected }) => {
		const list = providers.map((id) => ({ id }));
		expect(pickPreferredProvider(list)).toBe(expected);
	});
});

describe("isProductionProvider", () => {
	it("rozpoznaje providery produkcyjne", () => {
		expect(isProductionProvider(PRZELEWY24_PROVIDER_ID)).toBe(true);
		expect(isProductionProvider(STRIPE_PROVIDER_ID)).toBe(true);
		expect(isProductionProvider(TPAY_PROVIDER_ID)).toBe(true);
	});

	it("manual nie jest produkcyjny", () => {
		expect(isProductionProvider(SYSTEM_PAYMENT_PROVIDER_ID)).toBe(false);
	});

	it("nieznany provider nie jest produkcyjny", () => {
		expect(isProductionProvider("pp_paypal_paypal")).toBe(false);
	});
});
