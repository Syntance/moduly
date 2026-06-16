import "server-only";

import { z } from "zod";

const optionalTrimmed = z
	.string()
	.optional()
	.transform((value) => {
		const trimmed = value?.trim();
		return trimmed || undefined;
	});

const analyticsEnvSchema = z.object({
	FEATURE_ANALYTICS_PANEL: optionalTrimmed,
	GA4_PROPERTY_ID: optionalTrimmed,
	GA4_SERVICE_ACCOUNT_JSON: optionalTrimmed,
	POSTHOG_PERSONAL_API_KEY: optionalTrimmed,
	POSTHOG_PROJECT_ID: optionalTrimmed,
	POSTHOG_HOST: optionalTrimmed,
});

type ParsedAnalyticsEnv = z.infer<typeof analyticsEnvSchema>;

let cached: ParsedAnalyticsEnv | null = null;

function getParsed(): ParsedAnalyticsEnv {
	if (!cached) {
		const result = analyticsEnvSchema.safeParse(process.env);
		if (!result.success) {
			throw new Error(`Nieprawidłowa konfiguracja analityki: ${result.error.message}`);
		}
		cached = result.data;
	}
	return cached;
}

function parseServiceAccountJson(raw: string | undefined): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

export const analyticsEnv = {
	get panelEnabled(): boolean {
		const flag = getParsed().FEATURE_ANALYTICS_PANEL;
		if (flag === "0" || flag === "false") return false;
		return true;
	},
	get ga4PropertyId(): string | undefined {
		return getParsed().GA4_PROPERTY_ID;
	},
	get ga4Credentials(): Record<string, unknown> | null {
		return parseServiceAccountJson(getParsed().GA4_SERVICE_ACCOUNT_JSON);
	},
	get ga4Configured(): boolean {
		return Boolean(analyticsEnv.ga4PropertyId && analyticsEnv.ga4Credentials);
	},
	get posthogPersonalApiKey(): string | undefined {
		return getParsed().POSTHOG_PERSONAL_API_KEY;
	},
	get posthogProjectId(): string | undefined {
		return getParsed().POSTHOG_PROJECT_ID;
	},
	get posthogHost(): string {
		const host = getParsed().POSTHOG_HOST ?? "https://eu.posthog.com";
		return host.replace(/\/$/, "");
	},
	get posthogConfigured(): boolean {
		return Boolean(analyticsEnv.posthogPersonalApiKey && analyticsEnv.posthogProjectId);
	},
};
