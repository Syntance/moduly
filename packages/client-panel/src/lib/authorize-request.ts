import "server-only";

import { cookies } from "next/headers";
import type { CookieAdapter } from "@moduly/auth-core";
import { getClientPanelConfig } from "../configure";
import { getCustomerEmailFromCookies } from "./auth";

function cookieAdapterFromHeader(header: string | null): CookieAdapter {
	return {
		get(name: string) {
			if (!header) return undefined;
			const match = header
				.split(";")
				.map((part) => part.trim())
				.find((part) => part.startsWith(`${name}=`));
			if (!match) return undefined;
			return decodeURIComponent(match.slice(name.length + 1));
		},
		set() {
			/* read-only adapter */
		},
		delete() {
			/* read-only adapter */
		},
	};
}

/** Adapter Next.js cookies → CookieAdapter auth-core. */
export async function nextCookieAdapter(): Promise<CookieAdapter> {
	const jar = await cookies();
	return {
		get(name: string) {
			return jar.get(name)?.value;
		},
		set(name, value, options) {
			jar.set(name, value, options);
		},
		delete(name) {
			jar.delete(name);
		},
	};
}

/** E-mail klienta z httpOnly cookie (bez Bearer / localStorage). */
export async function authorizeCustomerRequest(): Promise<string | null> {
	const adapter = await nextCookieAdapter();
	return getCustomerEmailFromCookies(adapter);
}

/** Wersja dla route handlerów — walidacja JWT z cookie żądania. */
export async function getCustomerEmailFromRequest(
	request: Request,
): Promise<string | null> {
	const cookieName = getClientPanelConfig().customerCookieName;
	const adapter = cookieAdapterFromHeader(request.headers.get("cookie"));
	const originalGet = adapter.get.bind(adapter);
	adapter.get = (name: string) =>
		name === cookieName ? originalGet(name) : originalGet(name);
	return getCustomerEmailFromCookies(adapter);
}
