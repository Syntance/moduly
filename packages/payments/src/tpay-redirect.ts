import { TPAY_PROVIDER_ID } from "./providers";

type PaymentSessionData = Record<string, unknown> | undefined;

/**
 * Wyciąga URL przekierowania tpay z danych sesji płatności Medusy.
 */
export function extractTpayRedirectUrl(session: {
	provider_id?: string;
	data?: PaymentSessionData;
}): string | null {
	if (session.provider_id && session.provider_id !== TPAY_PROVIDER_ID) {
		return null;
	}

	const data = session.data ?? {};
	const candidates = [data.redirect_url, data.url, data.transactionPaymentUrl];

	for (const candidate of candidates) {
		if (typeof candidate === "string" && candidate.startsWith("http")) {
			return candidate;
		}
	}

	return null;
}

/** Przekierowuje klienta na bramkę tpay (tylko w przeglądarce). */
export function redirectToTpay(url: string): void {
	if (typeof window === "undefined") return;
	window.location.assign(url);
}

/**
 * Inicjuje flow tpay — zwraca URL do przekierowania lub rzuca gdy brak.
 */
export function assertTpayRedirectUrl(session: {
	provider_id?: string;
	data?: PaymentSessionData;
}): string {
	const url = extractTpayRedirectUrl(session);
	if (!url) {
		throw new Error("Nie udało się przygotować płatności tpay. Spróbuj ponownie.");
	}
	return url;
}
