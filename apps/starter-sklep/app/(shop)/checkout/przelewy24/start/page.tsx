"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
	initPrzelewy24Redirect,
	markP24PaymentStarted,
	openP24PaymentPopup,
	retryPrzelewy24Payment,
} from "@moduly/commerce";

type StartState =
	| { kind: "redirecting" }
	| { kind: "popup_open"; paymentUrl: string }
	| { kind: "aborted" }
	| { kind: "error"; message: string };

function isBackForwardNavigation(): boolean {
	if (typeof window === "undefined") return false;
	const nav = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	return nav?.type === "back_forward";
}

function P24StartInner() {
	const router = useRouter();
	const params = useSearchParams();
	const cartId = params.get("cart_id")?.trim() ?? "";
	const isRetry = params.get("retry") === "1";
	const [state, setState] = useState<StartState>({ kind: "redirecting" });
	const [retrying, setRetrying] = useState(false);
	const autoStartedRef = useRef(false);
	const popupRef = useRef<Window | null>(null);

	const closePopup = useCallback(() => {
		try {
			popupRef.current?.close();
		} catch {
			/* ignore */
		}
		popupRef.current = null;
	}, []);

	const goToCheckout = useCallback(() => {
		closePopup();
		router.push("/checkout");
	}, [closePopup, router]);

	const goToP24 = useCallback(async () => {
		if (!cartId) {
			setState({
				kind: "error",
				message: "Brak identyfikatora koszyka. Wróć do checkoutu i spróbuj ponownie.",
			});
			return;
		}

		setState({ kind: "redirecting" });
		markP24PaymentStarted(cartId);

		try {
			const url = isRetry
				? await retryPrzelewy24Payment(cartId)
				: await initPrzelewy24Redirect(cartId);

			closePopup();
			const paymentWindow = openP24PaymentPopup(url);
			if (paymentWindow) {
				popupRef.current = paymentWindow;
				setState({ kind: "popup_open", paymentUrl: url });
				return;
			}

			window.location.assign(url);
		} catch (e) {
			setState({
				kind: "error",
				message:
					e instanceof Error
						? e.message
						: "Nie udało się przygotować płatności. Spróbuj ponownie.",
			});
		}
	}, [cartId, closePopup, isRetry]);

	useEffect(() => {
		const onPageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			closePopup();
			setState({ kind: "aborted" });
		};
		window.addEventListener("pageshow", onPageShow);
		return () => window.removeEventListener("pageshow", onPageShow);
	}, [closePopup]);

	useEffect(() => {
		if (state.kind !== "popup_open") return;
		const timer = window.setInterval(() => {
			if (!popupRef.current?.closed) return;
			popupRef.current = null;
			setState({ kind: "aborted" });
		}, 400);
		return () => window.clearInterval(timer);
	}, [state.kind]);

	useEffect(() => {
		if (autoStartedRef.current) return;
		autoStartedRef.current = true;
		if (isBackForwardNavigation()) {
			setState({ kind: "aborted" });
			return;
		}
		void goToP24();
	}, [goToP24]);

	useEffect(() => () => closePopup(), [closePopup]);

	const handleRetry = async () => {
		setRetrying(true);
		await goToP24();
		setRetrying(false);
	};

	if (state.kind === "popup_open") {
		return (
			<div className="mx-auto max-w-lg px-4 py-16 text-center">
				<h1 className="text-2xl font-semibold">Dokończ płatność w oknie Przelewy24</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Płatność działa w osobnym oknie. Jeśli pojawi się błąd, otwórz okno
					ponownie albo wróć do checkoutu — produkty zostają w koszyku.
				</p>
				<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<button
						type="button"
						onClick={() => {
							closePopup();
							const popup = openP24PaymentPopup(state.paymentUrl);
							if (popup) popupRef.current = popup;
						}}
						className="rounded-md bg-foreground px-6 py-3 text-sm font-semibold text-background"
					>
						Otwórz okno płatności ponownie
					</button>
					<button
						type="button"
						onClick={goToCheckout}
						className="rounded-md border px-6 py-3 text-sm font-semibold"
					>
						Wróć do checkoutu
					</button>
				</div>
			</div>
		);
	}

	if (state.kind === "redirecting") {
		return (
			<div className="mx-auto max-w-md px-4 py-20 text-center">
				<h1 className="text-2xl font-semibold">Przekierowujemy do Przelewy24…</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Za chwilę przejdziesz do bezpiecznej bramki płatności.
				</p>
				<Link href="/checkout" className="mt-8 inline-block text-sm underline">
					Anuluj i wróć do checkoutu
				</Link>
			</div>
		);
	}

	const isAborted = state.kind === "aborted";
	return (
		<div className="mx-auto max-w-md px-4 py-20 text-center">
			<h1 className="text-2xl font-semibold">
				{isAborted ? "Płatność nie została dokończona" : "Nie udało się rozpocząć płatności"}
			</h1>
			<p className="mt-3 text-sm text-muted-foreground">
				{isAborted
					? "Opuszczono bramkę Przelewy24 lub wystąpił błąd operatora. Produkty nadal są w koszyku."
					: state.kind === "error"
						? state.message
						: ""}
			</p>
			<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
				<button
					type="button"
					onClick={handleRetry}
					disabled={retrying}
					className="rounded-md bg-foreground px-6 py-3 text-sm font-semibold text-background disabled:opacity-60"
				>
					{retrying ? "Przekierowujemy…" : "Spróbuj ponownie"}
				</button>
				<Link href="/checkout" className="rounded-md border px-6 py-3 text-sm font-semibold">
					Wróć do checkoutu
				</Link>
			</div>
		</div>
	);
}

export default function P24StartPage() {
	return (
		<Suspense
			fallback={
				<div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">
					Ładowanie…
				</div>
			}
		>
			<P24StartInner />
		</Suspense>
	);
}
