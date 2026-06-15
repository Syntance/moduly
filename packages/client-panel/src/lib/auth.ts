import "server-only";

import type { CookieAdapter } from "@moduly/auth-core";
import { getCustomerOtpAuth } from "../configure";

export async function createCustomerOtp(email: string): Promise<string> {
	const auth = getCustomerOtpAuth();
	return auth.createOtp(email);
}

export async function verifyCustomerOtpAndSetSession(
	email: string,
	code: string,
	cookies: CookieAdapter,
) {
	const auth = getCustomerOtpAuth();
	return auth.verifyOtpAndIssueSession(email, code, cookies);
}

export async function getCustomerSession(cookies: CookieAdapter) {
	const auth = getCustomerOtpAuth();
	return auth.validateCustomerSession(cookies);
}

export async function logoutCustomerSession(cookies: CookieAdapter): Promise<void> {
	const auth = getCustomerOtpAuth();
	await auth.logoutCustomer(cookies);
}

export async function getCustomerEmailFromCookies(
	cookies: CookieAdapter,
): Promise<string | null> {
	const session = await getCustomerSession(cookies);
	return session?.email ?? null;
}
