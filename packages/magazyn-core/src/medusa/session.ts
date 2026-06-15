import "server-only";

import { cookies } from "next/headers";
import { getAdminCookieName } from "../configure";

const MAX_AGE_SECONDS = 60 * 60 * 24;

export async function getSessionToken(): Promise<string | null> {
	const store = await cookies();
	return store.get(getAdminCookieName())?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
	const store = await cookies();
	store.set(getAdminCookieName(), token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: MAX_AGE_SECONDS,
	});
}

export async function clearSessionToken(): Promise<void> {
	const store = await cookies();
	store.delete(getAdminCookieName());
}
