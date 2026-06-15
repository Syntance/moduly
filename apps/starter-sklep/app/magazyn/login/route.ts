import { NextResponse } from "next/server";
import { modulyConfig } from "@/moduly.config";

/** Alias logowania — czyści wygasłe cookie i wraca na ekran logowania. */
export function GET(request: Request): NextResponse {
	const response = NextResponse.redirect(new URL(modulyConfig.basePath, request.url));
	response.cookies.delete(modulyConfig.auth.cookieName);
	return response;
}
