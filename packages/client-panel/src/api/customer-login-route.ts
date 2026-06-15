import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@moduly/magazyn-emails/send-transactional";
import { getClientPanelConfig } from "../configure";
import { createCustomerOtp } from "../lib/auth";
import { CustomerLoginSchema } from "../lib/validation/returns";

/** POST /api/customer/login — wysyła kod OTP na e-mail klienta. */
export async function handleCustomerLogin(request: Request): Promise<Response> {
	try {
		const body = await request.json();
		const parsed = CustomerLoginSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ ok: false, error: "Niepoprawny adres e-mail" },
				{ status: 400 },
			);
		}

		const { email } = parsed.data;
		const code = await createCustomerOtp(email);
		const brand = getClientPanelConfig().brandName;

		await sendTransactionalEmail({
			to: email,
			subject: `Twój kod do logowania — ${brand}`,
			text: `Twój kod: ${code}\n\nKod jest ważny przez 10 minut.`,
			html: `<p>Twój kod: <strong>${code}</strong></p><p>Kod jest ważny przez 10 minut.</p>`,
		});

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Nie udało się wysłać kodu" },
			{ status: 500 },
		);
	}
}
