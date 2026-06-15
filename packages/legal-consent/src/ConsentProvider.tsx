"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	CONSENT_EVENT,
	CONSENT_OPEN_EVENT,
	CONSENT_VERSION,
	getConsent,
	openConsentBanner,
	saveConsent,
	type ConsentState,
	type ConsentStorageOptions,
} from "./consent";

export type ConsentProviderConfig = ConsentStorageOptions & {
	/** Nazwa marki w banerze cookies. */
	siteName?: string;
	/** Link do polityki prywatności. */
	privacyPolicyHref?: string;
	/** Opis kategorii analityki w panelu preferencji. */
	analyticsDescription?: string;
	/** Opis kategorii marketingu w panelu preferencji. */
	marketingDescription?: string;
};

type ConsentContextValue = {
	consent: ConsentState | null;
	hasDecision: boolean;
	acceptAll: () => ConsentState;
	rejectAll: () => ConsentState;
	saveSelection: (input: { analytics: boolean; marketing: boolean }) => ConsentState;
	openPreferences: () => void;
	config: Required<
		Pick<
			ConsentProviderConfig,
			| "siteName"
			| "privacyPolicyHref"
			| "analyticsDescription"
			| "marketingDescription"
		>
	> &
		ConsentStorageOptions;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

const DEFAULT_CONFIG = {
	siteName: "Sklep",
	privacyPolicyHref: "/polityka-prywatnosci",
	analyticsDescription:
		"Anonimowe statystyki użycia strony — pomagają nam ulepszać sklep.",
	marketingDescription:
		"Personalizacja reklam w mediach społecznościowych.",
} as const;

export function ConsentProvider({
	children,
	siteName = DEFAULT_CONFIG.siteName,
	privacyPolicyHref = DEFAULT_CONFIG.privacyPolicyHref,
	analyticsDescription = DEFAULT_CONFIG.analyticsDescription,
	marketingDescription = DEFAULT_CONFIG.marketingDescription,
	storageKey,
	version = CONSENT_VERSION,
}: ConsentProviderConfig & { children: ReactNode }) {
	const storageOptions = useMemo(
		() => ({ storageKey, version }),
		[storageKey, version],
	);

	const [consent, setConsent] = useState<ConsentState | null>(null);

	useEffect(() => {
		setConsent(getConsent(storageOptions));

		const onUpdate = (event: Event) => {
			const custom = event as CustomEvent<ConsentState>;
			setConsent(custom.detail ?? getConsent(storageOptions));
		};

		window.addEventListener(CONSENT_EVENT, onUpdate);
		return () => { window.removeEventListener(CONSENT_EVENT, onUpdate); };
	}, [storageOptions]);

	const acceptAll = useCallback(() => {
		const next = saveConsent(
			{ analytics: true, marketing: true },
			storageOptions,
		);
		setConsent(next);
		return next;
	}, [storageOptions]);

	const rejectAll = useCallback(() => {
		const next = saveConsent(
			{ analytics: false, marketing: false },
			storageOptions,
		);
		setConsent(next);
		return next;
	}, [storageOptions]);

	const saveSelection = useCallback(
		(input: { analytics: boolean; marketing: boolean }) => {
			const next = saveConsent(input, storageOptions);
			setConsent(next);
			return next;
		},
		[storageOptions],
	);

	const openPreferences = useCallback(() => {
		openConsentBanner();
	}, []);

	const value = useMemo<ConsentContextValue>(
		() => ({
			consent,
			hasDecision: consent !== null,
			acceptAll,
			rejectAll,
			saveSelection,
			openPreferences,
			config: {
				siteName,
				privacyPolicyHref,
				analyticsDescription,
				marketingDescription,
				storageKey,
				version,
			},
		}),
		[
			acceptAll,
			analyticsDescription,
			consent,
			marketingDescription,
			openPreferences,
			privacyPolicyHref,
			rejectAll,
			saveSelection,
			siteName,
			storageKey,
			version,
		],
	);

	return (
		<ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
	);
}

export function useConsent(): ConsentContextValue {
	const ctx = useContext(ConsentContext);
	if (!ctx) {
		throw new Error(
			"useConsent() wymaga <ConsentProvider> — owiń layout aplikacji.",
		);
	}
	return ctx;
}

/** Hook do nasłuchiwania zdarzenia otwarcia panelu preferencji (np. w CookieConsent). */
export function useConsentOpenListener(onOpen: () => void): void {
	useEffect(() => {
		window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
		return () => { window.removeEventListener(CONSENT_OPEN_EVENT, onOpen); };
	}, [onOpen]);
}
