"use client";

import { useConsent } from "./ConsentProvider";

type FooterCookieSettingsProps = {
	className?: string;
};

export function FooterCookieSettings({
	className = "text-base text-neutral-400 hover:text-white transition-colors underline-offset-2 hover:underline",
}: FooterCookieSettingsProps) {
	const { openPreferences } = useConsent();

	return (
		<button type="button" onClick={openPreferences} className={className}>
			Ustawienia cookies
		</button>
	);
}
