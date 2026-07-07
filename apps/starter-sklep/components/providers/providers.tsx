"use client";

import type { ReactNode } from "react";
import { AnalyticsProvider } from "@moduly/analytics";
import { ConsentProvider, CookieConsent } from "@moduly/legal-consent";
import { modulyConfig } from "@/moduly.config";
import { CartProvider } from "@/components/providers/cart-provider";
import { CartProvider as CheckoutCartProvider } from "@/providers/CartProvider";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ConsentProvider
			siteName={modulyConfig.branding.name}
			privacyPolicyHref="/polityka-prywatnosci"
		>
			<AnalyticsProvider locale={modulyConfig.commerce.locale}>
				{/*
				 * Dwa providery koszyka współistnieją przejściowo (ADR 007):
				 * stary (drawer/PDP, @moduly/commerce) i blueprintowy
				 * (checkout P24 1:1 z produkcji). Oba czytają TEN SAM
				 * localStorage `moduly_cart_id`, więc stan koszyka jest
				 * współdzielony na poziomie Medusy.
				 */}
				<CheckoutCartProvider>
					<CartProvider>{children}</CartProvider>
				</CheckoutCartProvider>
				<CookieConsent />
			</AnalyticsProvider>
		</ConsentProvider>
	);
}
