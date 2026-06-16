import "server-only";

import {
	PRZELEWY24_PROVIDER_ID,
	STRIPE_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
	TPAY_PROVIDER_ID,
} from "@moduly/commerce/payments";

export type EnvFlagStatus = {
	featureEnabled: boolean;
	credentialsPresent: boolean;
	sandbox?: boolean;
};

function isSet(value: string | undefined): boolean {
	return Boolean(value?.trim());
}

export function getP24EnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: process.env.FEATURE_P24 === "1",
		credentialsPresent:
			isSet(process.env.PRZELEWY24_MERCHANT_ID) && isSet(process.env.PRZELEWY24_API_KEY),
		sandbox: process.env.PRZELEWY24_SANDBOX === "true",
	};
}

export function getStripeEnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: process.env.FEATURE_STRIPE === "1",
		credentialsPresent: isSet(process.env.STRIPE_API_KEY),
	};
}

export function getTpayEnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: process.env.FEATURE_TPAY === "1",
		credentialsPresent:
			isSet(process.env.TPAY_MERCHANT_ID) &&
			isSet(process.env.TPAY_API_PASSWORD) &&
			isSet(process.env.TPAY_SECURITY_CODE),
		sandbox: process.env.TPAY_SANDBOX === "true",
	};
}

export function getDpdEnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: true,
		credentialsPresent:
			isSet(process.env.DPD_LOGIN) &&
			isSet(process.env.DPD_PASSWORD) &&
			isSet(process.env.DPD_FID),
	};
}

export function getResendEnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: true,
		credentialsPresent: isSet(process.env.RESEND_API_KEY) && isSet(process.env.RESEND_FROM_EMAIL),
	};
}

export function getMedusaBackendEnvStatus(): EnvFlagStatus {
	return {
		featureEnabled: true,
		credentialsPresent:
			isSet(process.env.MEDUSA_BACKEND_URL) || isSet(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL),
	};
}

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
	[PRZELEWY24_PROVIDER_ID]: "Przelewy24",
	[STRIPE_PROVIDER_ID]: "Stripe",
	[TPAY_PROVIDER_ID]: "tpay",
	[SYSTEM_PAYMENT_PROVIDER_ID]: "Przelew bankowy",
};

export function paymentProviderLabel(id: string): string {
	return PAYMENT_PROVIDER_LABELS[id] ?? id;
}

export function envStatusForProvider(id: string): EnvFlagStatus | null {
	switch (id) {
		case PRZELEWY24_PROVIDER_ID:
			return getP24EnvStatus();
		case STRIPE_PROVIDER_ID:
			return getStripeEnvStatus();
		case TPAY_PROVIDER_ID:
			return getTpayEnvStatus();
		case SYSTEM_PAYMENT_PROVIDER_ID:
			return { featureEnabled: true, credentialsPresent: true };
		default:
			return null;
	}
}
