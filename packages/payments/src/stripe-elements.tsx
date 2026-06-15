"use client";

import { useEffect, useState, type ReactNode } from "react";
import type * as StripeReact from "@stripe/react-stripe-js";
import type * as StripeJs from "@stripe/stripe-js";

export type StripePaymentElementProps = {
	clientSecret: string;
	publishableKey: string;
	onReady?: () => void;
	onError?: (message: string) => void;
	loadingFallback?: ReactNode;
};

type StripeModule = typeof StripeReact;
type StripeJsModule = typeof StripeJs;

/**
 * Lazy wrapper Stripe Payment Element.
 *
 * W aplikacji konsumującej użyj dynamic import z `ssr: false`:
 *
 * ```tsx
 * import dynamic from "next/dynamic";
 *
 * const StripePaymentElement = dynamic(
 *   () => import("@moduly/payments/stripe-elements").then((m) => m.StripePaymentElement),
 *   { ssr: false, loading: () => <p>Ładowanie płatności…</p> },
 * );
 * ```
 */
export function StripePaymentElement({
	clientSecret,
	publishableKey,
	onReady,
	onError,
	loadingFallback = null,
}: StripePaymentElementProps) {
	const [stripeUi, setStripeUi] = useState<{
		Elements: StripeModule["Elements"];
		PaymentElement: StripeModule["PaymentElement"];
		stripe: Awaited<ReturnType<StripeJsModule["loadStripe"]>>;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			try {
				const [{ Elements, PaymentElement }, { loadStripe }] = await Promise.all([
					import("@stripe/react-stripe-js"),
					import("@stripe/stripe-js"),
				]);
				const stripe = await loadStripe(publishableKey);
				if (cancelled || !stripe) {
					if (!stripe) onError?.("Nie udało się załadować Stripe.");
					return;
				}
				setStripeUi({ Elements, PaymentElement, stripe });
				onReady?.();
			} catch (e) {
				const message =
					e instanceof Error ? e.message : "Nie udało się załadować Stripe.";
				onError?.(message);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [publishableKey, onReady, onError]);

	if (!stripeUi) {
		return loadingFallback;
	}

	const { Elements, PaymentElement, stripe } = stripeUi;

	return (
		<Elements stripe={stripe} options={{ clientSecret }}>
			<PaymentElement />
		</Elements>
	);
}
