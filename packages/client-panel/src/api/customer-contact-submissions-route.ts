import { NextResponse } from "next/server";
import { listContactSubmissionsForEmail } from "@moduly/magazyn-forms";
import { authorizeCustomerRequest } from "../lib/authorize-request";

/** GET /api/customer/contact-submissions — zgłoszenia formularzy klienta. */
export async function handleCustomerContactSubmissions(): Promise<Response> {
	try {
		const email = await authorizeCustomerRequest();
		if (!email) {
			return NextResponse.json({ ok: false, error: "Brak autoryzacji" }, { status: 401 });
		}

		const submissions = await listContactSubmissionsForEmail(email);
		return NextResponse.json({ ok: true, submissions });
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Nie udało się pobrać zgłoszeń" },
			{ status: 500 },
		);
	}
}
