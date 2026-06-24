import { describe, expect, it } from "vitest";
import { findReusableRedirectUrl } from "../src/medusa/checkout";
import { PRZELEWY24_PROVIDER_ID } from "../src/payments/providers";

function cartWithSessions(
	sessions: Array<{
		provider_id?: string;
		status?: string;
		data?: { redirect_url?: string };
	}>,
) {
	return { payment_collection: { payment_sessions: sessions } };
}

describe("findReusableRedirectUrl", () => {
	it("zwraca redirect_url dla pending sesji właściwego providera", () => {
		const cart = cartWithSessions([
			{
				provider_id: PRZELEWY24_PROVIDER_ID,
				status: "pending",
				data: { redirect_url: "https://sandbox.przelewy24.pl/trnRequest/abc" },
			},
		]);
		expect(findReusableRedirectUrl(cart, PRZELEWY24_PROVIDER_ID)).toBe(
			"https://sandbox.przelewy24.pl/trnRequest/abc",
		);
	});

	it("pomija sesje innego providera", () => {
		const cart = cartWithSessions([
			{
				provider_id: "pp_tpay_tpay",
				status: "pending",
				data: { redirect_url: "https://tpay.com/x" },
			},
		]);
		expect(findReusableRedirectUrl(cart, PRZELEWY24_PROVIDER_ID)).toBeNull();
	});

	it("pomija sesje już opłacone/inne niż pending", () => {
		const cart = cartWithSessions([
			{
				provider_id: PRZELEWY24_PROVIDER_ID,
				status: "authorized",
				data: { redirect_url: "https://sandbox.przelewy24.pl/trnRequest/old" },
			},
		]);
		expect(findReusableRedirectUrl(cart, PRZELEWY24_PROVIDER_ID)).toBeNull();
	});

	it("zwraca null gdy brak redirect_url", () => {
		const cart = cartWithSessions([
			{ provider_id: PRZELEWY24_PROVIDER_ID, status: "pending", data: {} },
		]);
		expect(findReusableRedirectUrl(cart, PRZELEWY24_PROVIDER_ID)).toBeNull();
	});

	it("zwraca null dla pustego koszyka", () => {
		expect(
			findReusableRedirectUrl({ payment_collection: null }, PRZELEWY24_PROVIDER_ID),
		).toBeNull();
	});
});
