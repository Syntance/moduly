"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConsent, useConsentOpenListener } from "./ConsentProvider";

type Mode = "hidden" | "banner" | "preferences";

/** Baner cookies z opóźnieniem 2s — nie blokuje LCP hero. */
export function CookieConsent() {
	const { consent, hasDecision, acceptAll, rejectAll, saveSelection, config } =
		useConsent();

	const [mode, setMode] = useState<Mode>("hidden");
	const [analytics, setAnalytics] = useState(true);
	const [marketing, setMarketing] = useState(true);
	const [canShow, setCanShow] = useState(false);

	useEffect(() => {
		const delayTimer = setTimeout(() => { setCanShow(true); }, 2000);
		return () => { clearTimeout(delayTimer); };
	}, []);

	useEffect(() => {
		if (!canShow) return;

		if (!hasDecision) {
			setMode("banner");
		} else if (consent) {
			setAnalytics(consent.analytics);
			setMarketing(consent.marketing);
		}
	}, [canShow, consent, hasDecision]);

	const openPreferences = useCallback(() => {
		if (consent) {
			setAnalytics(consent.analytics);
			setMarketing(consent.marketing);
		}
		setMode("preferences");
	}, [consent]);

	useConsentOpenListener(openPreferences);

	const persist = useCallback(
		(next: { analytics: boolean; marketing: boolean }) => {
			saveSelection(next);
			setMode("hidden");
		},
		[saveSelection],
	);

	const handleAcceptAll = useCallback(() => {
		acceptAll();
		setMode("hidden");
	}, [acceptAll]);

	const handleRejectAll = useCallback(() => {
		rejectAll();
		setMode("hidden");
	}, [rejectAll]);

	if (!canShow || mode === "hidden") return null;

	return (
		<div
			role="dialog"
			aria-modal="false"
			aria-labelledby="cookie-consent-title"
			className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-4 sm:px-6 sm:pb-6"
		>
			<div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6">
				{mode === "banner" ? (
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="max-w-xl">
							<h2
								id="cookie-consent-title"
								className="text-lg font-semibold text-neutral-900"
							>
								Ciasteczka w {config.siteName}
							</h2>
							<p className="mt-1 text-sm leading-snug text-neutral-600">
								Używamy plików cookie, żeby strona działała (koszyk, sesja), a za
								Twoją zgodą — także do analizy ruchu i reklam. Możesz zaakceptować
								wszystkie albo wybrać tylko te, których potrzebujesz.{" "}
								<Link
									href={config.privacyPolicyHref}
									className="underline underline-offset-2 hover:text-neutral-900"
								>
									Polityka prywatności
								</Link>
								.
							</p>
						</div>
						<div className="flex flex-col gap-2 sm:w-56 sm:shrink-0">
							<button
								type="button"
								onClick={handleAcceptAll}
								className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
							>
								Akceptuję wszystkie
							</button>
							<button
								type="button"
								onClick={handleRejectAll}
								className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
							>
								Tylko niezbędne
							</button>
							<button
								type="button"
								onClick={() => { setMode("preferences"); }}
								className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
							>
								Ustawienia
							</button>
						</div>
					</div>
				) : (
					<div>
						<h2
							id="cookie-consent-title"
							className="text-lg font-semibold text-neutral-900"
						>
							Ustawienia cookies
						</h2>
						<p className="mt-1 text-sm text-neutral-600">
							Wybierz kategorie, na które wyrażasz zgodę.
						</p>

						<ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
							<li className="flex items-start justify-between gap-4 p-4">
								<div>
									<p className="text-sm font-semibold text-neutral-900">
										Niezbędne
									</p>
									<p className="mt-0.5 text-xs text-neutral-500">
										Wymagane do działania koszyka, sesji i bezpieczeństwa. Nie
										można wyłączyć.
									</p>
								</div>
								<span className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
									zawsze aktywne
								</span>
							</li>

							<li className="flex items-start justify-between gap-4 p-4">
								<div>
									<p className="text-sm font-semibold text-neutral-900">
										Analityka
									</p>
									<p className="mt-0.5 text-xs text-neutral-500">
										{config.analyticsDescription}
									</p>
								</div>
								<ToggleSwitch
									checked={analytics}
									onChange={setAnalytics}
									label="Zgoda na analitykę"
								/>
							</li>

							<li className="flex items-start justify-between gap-4 p-4">
								<div>
									<p className="text-sm font-semibold text-neutral-900">
										Marketing
									</p>
									<p className="mt-0.5 text-xs text-neutral-500">
										{config.marketingDescription}
									</p>
								</div>
								<ToggleSwitch
									checked={marketing}
									onChange={setMarketing}
									label="Zgoda na marketing"
								/>
							</li>
						</ul>

						<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={handleRejectAll}
								className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
							>
								Odrzuć wszystko
							</button>
							<button
								type="button"
								onClick={() => { persist({ analytics, marketing }); }}
								className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
							>
								Zapisz wybór
							</button>
							<button
								type="button"
								onClick={handleAcceptAll}
								className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
							>
								Akceptuję wszystkie
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

interface ToggleSwitchProps {
	checked: boolean;
	onChange: (next: boolean) => void;
	label: string;
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => { onChange(!checked); }}
			className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
				checked ? "bg-neutral-900" : "bg-neutral-200"
			}`}
		>
			<span
				className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
					checked ? "translate-x-5" : "translate-x-0.5"
				}`}
			/>
		</button>
	);
}
