/** Nazwa okna / karty P24 — stała nazwa ułatwia handoff z urlReturn. */
export const P24_POPUP_WINDOW_NAME = "moduly_p24_payment";

function focusWindow(target: Window): void {
	try {
		target.focus();
	} catch {
		/* Safari private mode */
	}
}

/**
 * Otwiera P24 w osobnym oknie (desktop) lub karcie (mobile).
 * Karta sklepu z przyciskiem „Anuluj” zostaje otwarta — nie da się dodać UI wewnątrz P24.
 */
export function openP24PaymentPopup(url: string): Window | null {
	if (typeof window === "undefined") return null;

	const isDesktop =
		window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;

	if (isDesktop) {
		const popup = window.open(
			url,
			P24_POPUP_WINDOW_NAME,
			[
				"popup=yes",
				"width=520",
				"height=760",
				"left=80",
				"top=40",
				"scrollbars=yes",
				"resizable=yes",
			].join(","),
		);
		if (popup) {
			focusWindow(popup);
			return popup;
		}
	}

	const tab = window.open(url, P24_POPUP_WINDOW_NAME);
	if (tab) {
		focusWindow(tab);
		return tab;
	}

	return null;
}

/**
 * Gdy P24 przekieruje okno/kartę na urlReturn — przenieś flow do okna sklepu i zamknij kartę P24.
 */
export function handoffP24PopupToOpener(): boolean {
	if (typeof window === "undefined") return false;
	const opener = window.opener;
	if (!opener || opener.closed) return false;
	try {
		opener.location.replace(window.location.href);
		window.close();
		return true;
	} catch {
		return false;
	}
}
