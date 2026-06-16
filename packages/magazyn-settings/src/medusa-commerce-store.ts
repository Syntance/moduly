import "server-only";

import { adminFetch } from "@moduly/magazyn-core";
import { formatPrice, toMinorUnitsFromDecimal } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { PaymentProviderStatus, ShippingOptionStatus } from "./types";
import {
	envStatusForProvider,
	getDpdEnvStatus,
	paymentProviderLabel,
} from "./env-integration-status";

type MedusaRegion = {
	id: string;
	name?: string | null;
	currency_code?: string | null;
	payment_providers?: Array<{ id?: string | null; is_enabled?: boolean | null }> | null;
};

type MedusaShippingOption = {
	id: string;
	name?: string | null;
	amount?: number | null;
	currency_code?: string | null;
	region_id?: string | null;
	provider_id?: string | null;
	price_type?: string | null;
};

const FULFILLMENT_LABELS: Record<string, string> = {
	manual_manual: "Ręczna / stała cena",
	dpd_dpd: "DPD",
};

function fulfillmentLabel(providerId: string | null | undefined): string {
	if (!providerId) return "—";
	return FULFILLMENT_LABELS[providerId] ?? providerId;
}

export async function fetchMedusaRegions(): Promise<MedusaRegion[]> {
	try {
		const data = await adminFetch<{ regions: MedusaRegion[] }>(
			"/admin/regions?limit=50&fields=id,name,currency_code,*payment_providers",
		);
		return data.regions ?? [];
	} catch {
		return [];
	}
}

export async function fetchMedusaShippingOptions(): Promise<MedusaShippingOption[]> {
	try {
		const data = await adminFetch<{ shipping_options: MedusaShippingOption[] }>(
			"/admin/shipping-options?limit=100&fields=id,name,amount,currency_code,region_id,provider_id,price_type",
		);
		return data.shipping_options ?? [];
	} catch {
		return [];
	}
}

export async function buildPaymentProviderStatuses(): Promise<PaymentProviderStatus[]> {
	const cfg = getModulyConfig();
	const regions = await fetchMedusaRegions();
	const linkedIds = new Set<string>();

	for (const region of regions) {
		for (const provider of region.payment_providers ?? []) {
			if (provider?.id) linkedIds.add(provider.id);
		}
	}

	return cfg.payments.enabled.map((id) => {
		const env = envStatusForProvider(id);
		const registeredInMedusa = env
			? id === "pp_system_default" || (env.featureEnabled && env.credentialsPresent)
			: linkedIds.has(id);
		const regionLinked = linkedIds.has(id);

		let detail = "Skonfiguruj flagę FEATURE_* i klucze w ENV backendu Medusa.";
		if (id === "pp_system_default") {
			detail = `Dane przelewu z moduly.config.ts · ${cfg.payments.bankTransfer.iban.slice(0, 6)}…`;
		} else if (env?.featureEnabled && env.credentialsPresent && regionLinked) {
			detail = env.sandbox ? "Aktywne · sandbox" : "Aktywne · produkcja";
		} else if (env?.featureEnabled && env.credentialsPresent && !regionLinked) {
			detail = "Klucze OK — uruchom ensure-moduly-payment na backendzie.";
		} else if (!env?.featureEnabled) {
			detail = "Wyłączone (brak FEATURE_*=1 w ENV backendu).";
		} else if (!env?.credentialsPresent) {
			detail = "Brak wymaganych kluczy API w ENV backendu.";
		}

		return {
			id,
			label: paymentProviderLabel(id),
			registeredInMedusa,
			envConfigured: env?.credentialsPresent ?? regionLinked,
			regionLinked,
			sandbox: env?.sandbox,
			detail,
		};
	});
}

export async function buildShippingOptionStatuses(): Promise<ShippingOptionStatus[]> {
	const regions = await fetchMedusaRegions();
	const regionNames = new Map(regions.map((r) => [r.id, r.name ?? r.id]));
	const options = await fetchMedusaShippingOptions();
	const currency = getModulyConfig().commerce.currency;
	const locale = getModulyConfig().commerce.locale;

	if (options.length === 0) {
		return [];
	}

	return options.map((option) => {
		const minor = toMinorUnitsFromDecimal(option.amount ?? 0);
		const priceLabel =
			option.price_type === "flat" || option.amount != null
				? formatPrice(minor, { currency: option.currency_code ?? currency, locale })
				: "Cena dynamiczna";

		return {
			id: option.id,
			name: option.name?.trim() || "Metoda dostawy",
			regionName: regionNames.get(option.region_id ?? "") ?? "—",
			priceLabel,
			providerLabel: fulfillmentLabel(option.provider_id),
		};
	});
}

export async function isMedusaCommerceReachable(): Promise<boolean> {
	const regions = await fetchMedusaRegions();
	return regions.length > 0;
}

export function getDpdIntegrationDetail(): string {
	const env = getDpdEnvStatus();
	if (env.credentialsPresent) return "DPD skonfigurowane (ENV backendu).";
	return "DPD niedostępne — ustaw DPD_LOGIN, DPD_PASSWORD, DPD_FID w backendzie.";
}
