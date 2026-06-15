import { NextResponse } from "next/server";
import { clearSessionToken } from "@moduly/magazyn-core";
import { modulyConfig } from "@/moduly.config";

export async function GET(request: Request): Promise<NextResponse> {
	await clearSessionToken();
	return NextResponse.redirect(new URL(modulyConfig.basePath, request.url));
}
