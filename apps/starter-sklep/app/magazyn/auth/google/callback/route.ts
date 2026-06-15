import { NextResponse } from "next/server";
import { modulyConfig } from "@/moduly.config";

/** Callback Google OAuth — przekierowanie na logowanie z komunikatem błędu gdy brak implementacji. */
export function GET(request: Request): NextResponse {
	return NextResponse.redirect(new URL(`${modulyConfig.basePath}?error=google`, request.url));
}
