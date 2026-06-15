import { NextResponse } from "next/server";
import { nextCookieAdapter } from "../lib/authorize-request";
import { verifyCustomerOtpAndSetSession } from "../lib/auth";
import { CustomerVerifyOtpSchema } from "../lib/validation/returns";

/** POST /api/customer/verify-otp — weryfikuje OTP i ustawia httpOnly cookie. */
export async function handleCustomerVerifyOtp(request: Request): Promise<Response> {
	try {
		const body = await request.json();
		const parsed = CustomerVerifyOtpSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ ok: false, error: "Niepoprawny format danych" },
				{ status: 400 },
			);
		}

		const { email, code } = parsed.data;
		const cookies = await nextCookieAdapter();

		try {
			await verifyCustomerOtpAndSetSession(email, code, cookies);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Niepoprawny kod lub wygasł";
			return NextResponse.json({ ok: false, error: message }, { status: 401 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Błąd weryfikacji" },
			{ status: 500 },
		);
	}
}
