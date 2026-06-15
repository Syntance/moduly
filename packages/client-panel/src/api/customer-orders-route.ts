import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../lib/authorize-request";
import { getCustomerOrders } from "../lib/orders";

/** GET /api/customer/orders — zamówienia zalogowanego klienta. */
export async function handleCustomerOrders(): Promise<Response> {
	try {
		const email = await authorizeCustomerRequest();
		if (!email) {
			return NextResponse.json({ ok: false, error: "Brak autoryzacji" }, { status: 401 });
		}

		const orders = await getCustomerOrders(email);
		return NextResponse.json({ ok: true, orders });
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Nie udało się pobrać zamówień" },
			{ status: 500 },
		);
	}
}
