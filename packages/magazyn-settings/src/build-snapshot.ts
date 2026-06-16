import "server-only";

import { getModulyConfig } from "@moduly/magazyn-core/config";
import { getAdminAllowlist, serverEnv } from "@moduly/magazyn-core";
import { getMagazynSettingsConfig } from "./configure";
import {
	getMedusaBackendEnvStatus,
	getResendEnvStatus,
	getDpdEnvStatus,
} from "./env-integration-status";
import {
	buildPaymentProviderStatuses,
	buildShippingOptionStatuses,
	getDpdIntegrationDetail,
	isMedusaCommerceReachable,
} from "./medusa-commerce-store";
import { getPanelSettings, resolveNotificationEmails } from "./panel-settings-store";
import type { PanelNotificationSettings } from "@moduly/types";
import type { SettingsStatusSection, SetupCheckItem, SettingsStatusField } from "./types";

function fieldStatus(ok: boolean, warning = false): "ok" | "warning" | "missing" {
	if (ok) return "ok";
	return warning ? "warning" : "missing";
}

export async function buildSetupChecklist(): Promise<SetupCheckItem[]> {
	const cfg = getModulyConfig();
	const settingsCfg = getMagazynSettingsConfig();
	const items: SetupCheckItem[] = [];
	const isShop = settingsCfg.commerceBackend === "medusa";

	if (isShop) {
		const medusaEnv = getMedusaBackendEnvStatus();
		items.push({
			id: "medusa-url",
			label: "URL backendu Medusa",
			status: fieldStatus(medusaEnv.credentialsPresent),
			detail: medusaEnv.credentialsPresent
				? serverEnv.medusaBackendUrl
				: "Ustaw MEDUSA_BACKEND_URL w .env.local storefrontu.",
		});

		const reachable = await isMedusaCommerceReachable();
		items.push({
			id: "medusa-regions",
			label: "Region sklepu (Medusa)",
			status: fieldStatus(reachable),
			detail: reachable
				? "Region i providery płatności dostępne przez Admin API."
				: "Brak regionów — utwórz region w Medusie i uruchom ensure-moduly-payment.",
		});

		const providers = await buildPaymentProviderStatuses();
		const anyPaymentReady = providers.some((p) => p.regionLinked);
		items.push({
			id: "payments",
			label: "Metody płatności",
			status: fieldStatus(anyPaymentReady, providers.some((p) => p.envConfigured)),
			detail: anyPaymentReady
				? "Co najmniej jeden provider podpięty do regionu."
				: "Ustaw FEATURE_* + klucze w backendzie, potem ensure-moduly-payment.",
		});

		const shipping = await buildShippingOptionStatuses();
		items.push({
			id: "shipping",
			label: "Metody dostawy",
			status: fieldStatus(shipping.length > 0),
			detail:
				shipping.length > 0
					? `${shipping.length} opcji w Medusie.`
					: "Dodaj shipping options w Medusie (Admin API / seed).",
		});
	} else {
		items.push({
			id: "cms-mode",
			label: "Tryb strony CMS",
			status: "info",
			detail: "Commerce wyłączone — checklist sklepu pominięty.",
		});
	}

	const resend = getResendEnvStatus();
	items.push({
		id: "resend",
		label: "E-maile transakcyjne (Resend)",
		status: fieldStatus(resend.credentialsPresent, true),
		detail: resend.credentialsPresent
			? `Nadawca: ${serverEnv.resendFromEmail ?? "—"}`
			: "Ustaw RESEND_API_KEY i RESEND_FROM_EMAIL (backend + storefront).",
	});

	const allowlist = getAdminAllowlist();
	items.push({
		id: "allowlist",
		label: "Allowlist administratorów",
		status: fieldStatus(allowlist.length > 0, true),
		detail:
			allowlist.length > 0
				? `${allowlist.length} adresów w MAGAZYN_ADMIN_ALLOWLIST.`
				: "Puste = brak ograniczenia (OK na dev, ustaw na produkcji).",
	});

	items.push({
		id: "storefront",
		label: "Publiczny URL sklepu",
		status: fieldStatus(Boolean(cfg.branding.storefrontUrl)),
		detail: cfg.branding.storefrontUrl,
	});

	return items;
}

export async function buildGeneralSection(): Promise<SettingsStatusSection> {
	const cfg = getModulyConfig();
	return {
		id: "ogolne",
		tytul: "Dane sklepu",
		opis: "Branding i parametry z moduly.config.ts — edytuj plik configu przy wdrożeniu.",
		pola: [
			{ label: "Nazwa sklepu", val: cfg.branding.name, status: "info" },
			{ label: "Panel", val: cfg.branding.panelTitle, status: "info" },
			{ label: "Domena / storefront", val: cfg.branding.storefrontUrl, status: "ok" },
			{
				label: "Waluta",
				val: `${cfg.commerce.currency.toUpperCase()} · ${cfg.commerce.locale}`,
				status: "info",
			},
			{
				label: "Auth panelu",
				val: cfg.auth.provider === "medusa" ? "Medusa Admin JWT" : "Postgres",
				status: "info",
			},
			{
				label: "Kontakt (domyślny)",
				val: cfg.email.contactEmail,
				status: "ok",
			},
		],
	};
}

export async function buildPaymentsSection(): Promise<SettingsStatusSection> {
	const settingsCfg = getMagazynSettingsConfig();
	if (settingsCfg.commerceBackend !== "medusa") {
		return {
			id: "platnosci",
			tytul: "Płatności",
			opis: "Ten starter nie używa Medusa Commerce.",
			pola: [
				{
					label: "Commerce",
					val: "Niedostępne w trybie strony CMS",
					status: "info",
					hint: "Użyj startera sklep + backend Medusa, aby włączyć checkout.",
				},
			],
		};
	}

	const providers = await buildPaymentProviderStatuses();
	const cfg = getModulyConfig();

	const pola: SettingsStatusField[] = providers.map((p) => ({
		label: p.label,
		val: p.detail,
		status: fieldStatus(p.regionLinked, p.envConfigured),
		hint:
			p.regionLinked || p.id === "pp_system_default"
				? undefined
				: "Backend: FEATURE_*=1 + klucze · potem medusa exec ensure-moduly-payment",
	}));

	pola.push(
		{
			label: "Domyślny provider (config)",
			val: cfg.payments.defaultProvider,
			status: "info",
		},
		{
			label: "Przelew — odbiorca",
			val: cfg.payments.bankTransfer.recipientName,
			status: "info",
		},
	);

	return {
		id: "platnosci",
		tytul: "Płatności",
		opis: "Status integracji — klucze API wyłącznie w ENV backendu Medusa. Priorytet checkoutu: P24 → Stripe → tpay → przelew.",
		pola,
	};
}

export async function buildShippingSection(): Promise<SettingsStatusSection> {
	const settingsCfg = getMagazynSettingsConfig();
	if (settingsCfg.commerceBackend !== "medusa") {
		return {
			id: "dostawa",
			tytul: "Dostawa",
			opis: "Wymaga backendu Medusa.",
			pola: [
				{
					label: "Commerce",
					val: "Niedostępne w trybie strony CMS",
					status: "info",
				},
			],
		};
	}

	const options = await buildShippingOptionStatuses();
	const dpdEnv = getDpdEnvStatus();
	const dpdDetail = getDpdIntegrationDetail();

	if (options.length === 0) {
		return {
			id: "dostawa",
			tytul: "Dostawa",
			opis: "Metody z Medusa Admin API + integracja kurierska w backendzie.",
			pola: [
				{
					label: "Metody wysyłki",
					val: "Brak shipping options w Medusie",
					status: "missing",
					hint: "Skonfiguruj region, fulfillment provider i shipping options w Medusie.",
				},
				{
					label: "Integracja DPD",
					val: dpdDetail,
					status: fieldStatus(dpdEnv.credentialsPresent, true),
				},
			],
		};
	}

	const pola: SettingsStatusField[] = options.map((o) => ({
		label: `${o.name} · ${o.regionName}`,
		val: `${o.priceLabel} · ${o.providerLabel}`,
		status: "ok",
	}));

	pola.push({
		label: "Integracja DPD",
		val: dpdDetail,
		status: fieldStatus(dpdEnv.credentialsPresent, true),
	});

	return {
		id: "dostawa",
		tytul: "Dostawa",
		opis: "Aktywne metody z Medusa — ceny w najmniejszej jednostce waluty regionu.",
		pola,
	};
}

export async function buildNotificationsSection(): Promise<SettingsStatusSection> {
	const cfg = getModulyConfig();
	const panel = await getPanelSettings();
	const emails = resolveNotificationEmails(panel, cfg.email.contactEmail);
	const resendTo = serverEnv.resendContactTo ?? cfg.email.contactEmail;

	return {
		id: "powiadomienia",
		tytul: "Powiadomienia",
		opis: "Adresy operacyjne — edytowalne poniżej (zapis w metadata sklepu) lub domyślnie z moduly.config.ts.",
		pola: [
			{ label: "Nowe zamówienie", val: emails.orderEmail, status: "ok" },
			{ label: "Niski stan magazynu", val: emails.lowStockEmail, status: "info" },
			{ label: "Formularze kontaktowe", val: emails.formEmail, status: "ok" },
			{ label: "Zwroty / reklamacje", val: emails.returnsEmail, status: "ok" },
			{
				label: "Resend (formularze storefront)",
				val: resendTo,
				status: fieldStatus(Boolean(serverEnv.resendContactTo || serverEnv.resendApiKey), true),
				hint: "RESEND_CONTACT_TO w ENV storefrontu",
			},
		],
	};
}

export async function buildSecuritySection(): Promise<SettingsStatusSection> {
	const cfg = getModulyConfig();
	const allowlist = getAdminAllowlist();
	const redisConfigured = Boolean(
		serverEnv.upstashRedisRestUrl && serverEnv.upstashRedisRestToken,
	);

	return {
		id: "bezpieczenstwo",
		tytul: "Bezpieczeństwo",
		opis: "Sesja panelu, allowlist i rate limiting — sekrety tylko w ENV.",
		pola: [
			{
				label: "Cookie sesji",
				val: cfg.auth.cookieName,
				status: "info",
			},
			{
				label: "Allowlist adminów",
				val:
					allowlist.length > 0
						? `${allowlist.length} adresów (MAGAZYN_ADMIN_ALLOWLIST)`
						: "Wyłączone — każdy zalogowany admin Medusa/Postgres",
				status: fieldStatus(allowlist.length > 0, true),
			},
			{
				label: "Rate limit (Redis)",
				val: redisConfigured ? "Upstash Redis aktywny" : "Nie skonfigurowany (fail-open)",
				status: fieldStatus(redisConfigured, true),
			},
			{
				label: "Logowanie Google",
				val: cfg.auth.google ? "Włączone w configu" : "Wyłączone",
				status: "info",
			},
		],
	};
}

export async function buildApiSection(): Promise<SettingsStatusSection> {
	const revalidateUrl = serverEnv.storefrontRevalidateUrl;
	const revalidateSecret = serverEnv.medusaRevalidateSecret;
	const deployHook = serverEnv.vercelDeployHookUrl;
	const r2 = serverEnv.r2Config;

	return {
		id: "api",
		tytul: "API & Webhooks",
		opis: "Integracje server-to-server — wartości z ENV, bez ekspozycji sekretów.",
		pola: [
			{
				label: "Revalidacja storefrontu",
				val: revalidateUrl ?? "Nie skonfigurowana",
				status: fieldStatus(Boolean(revalidateUrl), true),
				hint: "STOREFRONT_REVALIDATE_URL",
			},
			{
				label: "Sekret revalidacji",
				val: revalidateSecret ? "Ustawiony (MEDUSA_REVALIDATE_SECRET)" : "Brak",
				status: fieldStatus(Boolean(revalidateSecret), true),
			},
			{
				label: "Vercel deploy hook",
				val: deployHook ? "Skonfigurowany" : "Nieaktywny",
				status: fieldStatus(Boolean(deployHook), true),
				hint: "VERCEL_DEPLOY_HOOK_URL — opcjonalnie po CMS",
			},
			{
				label: "Media (R2/S3)",
				val: r2 ? `Bucket: ${r2.bucket}` : "Lokalny storage Medusa",
				status: fieldStatus(Boolean(r2), true),
			},
		],
	};
}

export async function getEditableNotifications(): Promise<{
	emails: Required<PanelNotificationSettings>;
	canEdit: boolean;
}> {
	const cfg = getModulyConfig();
	const panel = await getPanelSettings();
	const settingsCfg = getMagazynSettingsConfig();
	return {
		emails: resolveNotificationEmails(panel, cfg.email.contactEmail),
		canEdit: settingsCfg.commerceBackend === "medusa",
	};
}
