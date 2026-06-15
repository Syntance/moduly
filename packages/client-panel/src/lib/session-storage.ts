"use client";

/** Sesja klienta oparta o httpOnly cookie — brak localStorage. */
export const CUSTOMER_SESSION_CHANGED_EVENT = "moduly-customer-session-changed";

export function notifyCustomerSessionChanged(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(CUSTOMER_SESSION_CHANGED_EVENT));
}
