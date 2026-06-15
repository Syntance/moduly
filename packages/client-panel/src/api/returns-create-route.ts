import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
	EMAIL_CONTACT,
	buildCaseRenderVarsForNewWithdrawal,
	buildCustomerCaseEmailBodies,
	sendCaseCustomerEmail,
} from "@moduly/magazyn-emails/case-email";
import { sendTransactionalEmail } from "@moduly/magazyn-emails/send-transactional";
import {
	createReturnRequest,
	getActiveClaimForOrder,
} from "@moduly/magazyn-returns";
import { getClientPanelConfig } from "../configure";
import { getCustomerEmailFromRequest } from "../lib/authorize-request";
import { getCustomerOrderById } from "../lib/orders";
import { buildReturnItemsFromOrder } from "../lib/return-items";
import {
	getLineItemsBlockedByOtherCases,
	validateReturnLineItemSelection,
} from "../lib/return-line-items";
import { CreateReturnSchema } from "../lib/validation/returns";

/** POST /api/returns/create — odstąpienie od umowy (14 dni). */
export async function handleReturnsCreate(request: Request): Promise<Response> {
	try {
		const email = await getCustomerEmailFromRequest(request);
		if (!email) {
			return NextResponse.json({ ok: false, error: "Brak autoryzacji" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = CreateReturnSchema.safeParse(body);
		if (!parsed.success) {
			const first = parsed.error.issues[0]?.message ?? "Niepoprawne dane";
			return NextResponse.json({ ok: false, error: first }, { status: 400 });
		}

		const { orderId, itemIds, reason } = parsed.data;
		const order = await getCustomerOrderById(email, orderId);
		if (!order) {
			return NextResponse.json(
				{ ok: false, error: "Nie znaleziono zamówienia dla tego konta." },
				{ status: 404 },
			);
		}

		if (!order.canReturn) {
			return NextResponse.json(
				{ ok: false, error: "Upłynął termin 14 dni na odstąpienie od umowy." },
				{ status: 400 },
			);
		}

		const activeClaim = await getActiveClaimForOrder(email, orderId);
		if (activeClaim) {
			const ref = activeClaim.claimReferenceId;
			return NextResponse.json(
				{
					ok: false,
					error: ref
						? `Na tym zamówieniu trwa reklamacja (${ref}). Odstąpienie nie jest możliwe równolegle.`
						: "Na tym zamówieniu trwa reklamacja — odstąpienie nie jest możliwe równolegle.",
				},
				{ status: 409 },
			);
		}

		const selectionError = validateReturnLineItemSelection(
			order.items,
			itemIds,
			getLineItemsBlockedByOtherCases(order),
		);
		if (selectionError) {
			return NextResponse.json({ ok: false, error: selectionError }, { status: 400 });
		}

		let items;
		let totalToRefund;
		try {
			const built = buildReturnItemsFromOrder(order, itemIds);
			items = built.items;
			totalToRefund = built.totalToRefund;
		} catch {
			return NextResponse.json(
				{ ok: false, error: "Nieprawidłowe pozycje zamówienia." },
				{ status: 400 },
			);
		}

		const cfg = getClientPanelConfig();
		const returnRequest = await createReturnRequest({
			requestType: "withdrawal",
			orderId: order.id,
			orderDisplayId: order.displayId,
			customerEmail: email,
			items,
			reason,
			totalToRefund,
		});

		const caseVars = buildCaseRenderVarsForNewWithdrawal({
			orderDisplayId: order.displayId,
			productTitles: items.map((item) => item.productTitle),
		});

		await sendCaseCustomerEmail({
			templateType: "withdrawal_received",
			to: email,
			vars: caseVars,
			fallback: {
				subject: `Złożono wniosek o odstąpienie — ${cfg.brandName}`,
				...buildCustomerCaseEmailBodies({
					tab: "zwroty",
					textBody: `Otrzymaliśmy Twój wniosek o odstąpienie (zamówienie #${order.displayId}).`,
					htmlBody: `<p>Otrzymaliśmy Twój wniosek o odstąpienie (zamówienie #${order.displayId}).</p>`,
				}),
			},
		});

		await sendTransactionalEmail({
			to: EMAIL_CONTACT,
			subject: `Nowe odstąpienie: zamówienie #${order.displayId}`,
			text: `Klient ${email} złożył wniosek o odstąpienie.\nPowód: ${reason}`,
			html: `<p>Nowe odstąpienie · #${order.displayId} · ${email}</p><p>${reason}</p>`,
		});

		revalidatePath(`${cfg.basePath}/zwroty`);

		return NextResponse.json({ ok: true, returnId: returnRequest.id });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się utworzyć wniosku";
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}
