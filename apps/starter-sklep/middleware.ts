import { NextResponse, type NextRequest } from "next/server";
import { modulyConfig } from "@/moduly.config";

/**
 * Ochrona panelu magazynu — bramka cookie przed shell panelu.
 * Pełna walidacja JWT odbywa się server-side (`loadAdmin`, `requireAdminSession`).
 */
const SESSION_COOKIE = modulyConfig.auth.cookieName;
const PANEL_PREFIX = `${modulyConfig.basePath}/panel`;

/** Opcjonalne trasy wymagające sesji klienta (OTP). */
const OPTIONAL_CUSTOMER_PROTECTED = ["/konto/reklamacje", "/konto/odstapienie"] as const;
const CUSTOMER_COOKIE = process.env.CUSTOMER_SESSION_COOKIE ?? "customer_session";

export function middleware(request: NextRequest): NextResponse {
	const { pathname } = request.nextUrl;

	const isPanel = pathname === PANEL_PREFIX || pathname.startsWith(`${PANEL_PREFIX}/`);
	if (isPanel) {
		const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
		if (!hasSession) {
			const loginUrl = new URL(modulyConfig.basePath, request.url);
			loginUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(loginUrl);
		}
		return NextResponse.next();
	}

	if (
		OPTIONAL_CUSTOMER_PROTECTED.some(
			(p) => pathname === p || pathname.startsWith(`${p}/`),
		)
	) {
		const hasCustomer = Boolean(request.cookies.get(CUSTOMER_COOKIE)?.value);
		if (!hasCustomer) {
			const loginUrl = new URL("/konto", request.url);
			loginUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/magazyn/panel/:path*", "/konto/reklamacje/:path*", "/konto/odstapienie/:path*"],
};
