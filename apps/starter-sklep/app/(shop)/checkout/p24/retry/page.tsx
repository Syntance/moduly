"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { markP24PaymentStarted } from "@moduly/commerce";

/**
 * Strona wejściowa z linku „ponów płatność" (e-mail / powrót). Przekierowuje na
 * `/checkout/przelewy24/start?retry=1`, który reużywa lub rejestruje sesję P24.
 */
function P24RetryInner() {
	const params = useSearchParams();
	const router = useRouter();
	const cartId = params.get("cart_id");
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		if (!cartId) return;
		markP24PaymentStarted(cartId);
		router.replace(
			`/checkout/przelewy24/start?cart_id=${encodeURIComponent(cartId)}&retry=1`,
		);
	}, [cartId, router]);

	if (!cartId) {
		return (
			<div className="mx-auto max-w-md px-4 py-20 text-center">
				<h1 className="text-2xl font-semibold">Nie udało się rozpocząć płatności</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Brak identyfikatora koszyka. Wróć do checkoutu i spróbuj ponownie.
				</p>
				<Link
					href="/checkout"
					className="mt-8 inline-block rounded-md bg-foreground px-8 py-3 text-sm font-semibold text-background"
				>
					Wróć do checkoutu
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-md px-4 py-20 text-center">
			<h1 className="text-2xl font-semibold">Przekierowujemy do płatności…</h1>
			<p className="mt-3 text-sm text-muted-foreground">
				Przygotowujemy bezpieczną sesję Przelewy24.
			</p>
		</div>
	);
}

export default function P24RetryPage() {
	return (
		<Suspense
			fallback={
				<div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">
					Ładowanie…
				</div>
			}
		>
			<P24RetryInner />
		</Suspense>
	);
}
