function readPublicEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === "production";
}

export const analyticsConfig = {
	get ga4Id(): string | undefined {
		return readPublicEnv("NEXT_PUBLIC_GA4_ID");
	},
	get posthogKey(): string | undefined {
		return readPublicEnv("NEXT_PUBLIC_POSTHOG_KEY");
	},
	get posthogHost(): string {
		return readPublicEnv("NEXT_PUBLIC_POSTHOG_HOST") ?? "https://eu.i.posthog.com";
	},
	get metaPixelId(): string | undefined {
		return readPublicEnv("NEXT_PUBLIC_META_PIXEL_ID");
	},
	get clarityId(): string | undefined {
		return readPublicEnv("NEXT_PUBLIC_CLARITY_ID");
	},
	get locale(): string {
		return readPublicEnv("NEXT_PUBLIC_SITE_LOCALE") ?? "pl-PL";
	},
};

export const enabled = {
	ga4(): boolean {
		return isProductionRuntime() && Boolean(analyticsConfig.ga4Id);
	},
	posthog(): boolean {
		return isProductionRuntime() && Boolean(analyticsConfig.posthogKey);
	},
	meta(): boolean {
		return isProductionRuntime() && Boolean(analyticsConfig.metaPixelId);
	},
	clarity(): boolean {
		return isProductionRuntime() && Boolean(analyticsConfig.clarityId);
	},
	any(): boolean {
		return enabled.ga4() || enabled.posthog() || enabled.meta() || enabled.clarity();
	},
};

export function isTrackingProduction(): boolean {
	return isProductionRuntime() && enabled.any();
}
