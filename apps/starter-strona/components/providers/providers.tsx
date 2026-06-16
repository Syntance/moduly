"use client";

import type { ReactNode } from "react";
import { AnalyticsProvider } from "@moduly/analytics";
import { ConsentProvider, CookieConsent } from "@moduly/legal-consent";
import { modulyConfig } from "../../moduly.config";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ConsentProvider
			siteName={modulyConfig.branding.name}
			privacyPolicyHref="/polityka-prywatnosci"
		>
			<AnalyticsProvider locale={modulyConfig.commerce.locale}>
				{children}
				<CookieConsent />
			</AnalyticsProvider>
		</ConsentProvider>
	);
}
