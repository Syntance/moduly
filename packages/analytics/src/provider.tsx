"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getConsent } from "@moduly/legal-consent";
import {
	applyConsentToDestinations,
	track,
	setTrackContext,
} from "./track";
import {
	initConsentMode,
	subscribeConsentUpdates,
	syncConsentFromState,
} from "./consent";
import { analyticsConfig, enabled } from "./config";
import { captureFirstTouchUtm } from "./context";

type Props = {
	children: ReactNode;
	locale?: string;
};

export function AnalyticsProvider({ children, locale = "pl-PL" }: Props) {
	const pathname = usePathname() ?? "/";

	useEffect(() => {
		captureFirstTouchUtm();
		initConsentMode();

		const existing = getConsent();
		if (existing) {
			syncConsentFromState(existing);
			void applyConsentToDestinations({
				analytics: existing.analytics,
				marketing: existing.marketing,
			});
		}

		return subscribeConsentUpdates((state) => {
			syncConsentFromState(state);
			void applyConsentToDestinations({
				analytics: state.analytics,
				marketing: state.marketing,
			});
		});
	}, []);

	useEffect(() => {
		setTrackContext(pathname, locale);
		track("page_view", {
			page_path: pathname,
			page_title: typeof document !== "undefined" ? document.title : undefined,
		});
	}, [pathname, locale]);

	return (
		<>
			{children}
			{enabled.ga4() && analyticsConfig.ga4Id ? (
				<GoogleAnalytics gaId={analyticsConfig.ga4Id} />
			) : null}
			<Analytics />
			<SpeedInsights />
		</>
	);
}
