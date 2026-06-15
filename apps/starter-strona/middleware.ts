import { NextResponse, type NextRequest } from "next/server";
import { modulyConfig } from "./moduly.config";

/**
 * Ochrona panelu admina — bramka na cookie sesji.
 * Pełna walidacja JWT i allowlisty odbywa się server-side (`requireAdminSessionForPanel`).
 */
const SESSION_COOKIE = modulyConfig.auth.cookieName;
const PANEL_PREFIX = `${modulyConfig.basePath}/panel`;
const LOGIN_PATH = modulyConfig.basePath;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPanel =
    pathname === PANEL_PREFIX || pathname.startsWith(`${PANEL_PREFIX}/`);
  if (!isPanel) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/magazyn/panel/:path*"],
};
