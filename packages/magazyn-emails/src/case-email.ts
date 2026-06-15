import "server-only";
import type { ReturnRequest, ReturnStatus } from "@moduly/types";
import { sendTransactionalEmail } from "./send-transactional";

/** Domyślny adres zespołu — nadpisz przez ENV w aplikacji. */
export const EMAIL_CONTACT =
	process.env.SHOP_ORDER_NOTIFY_EMAIL?.trim() ??
	process.env.CONTACT_INBOX_EMAIL?.trim() ??
	process.env.MODULY_CONTACT_EMAIL ??
	"kontakt@example.com";

export type CaseEmailVars = Record<string, string>;

export function buildCaseRenderVarsForNewWithdrawal(input: {
	orderDisplayId: number;
	productTitles: string[];
}): CaseEmailVars {
	return {
		orderDisplayId: String(input.orderDisplayId),
		productTitles: input.productTitles.join(", "),
	};
}

export function buildCustomerCaseEmailBodies(input: {
	tab: string;
	textBody: string;
	htmlBody: string;
}): { text: string; html: string } {
	return { text: input.textBody, html: input.htmlBody };
}

export async function sendReturnStatusCustomerEmail(
	returnReq: ReturnRequest,
	status: ReturnStatus,
	extra?: { rejectionReason?: string },
): Promise<{ ok: true; skipped?: boolean } | { ok: false; message: string }> {
	const subject =
		status === "approved"
			? `Wniosek zaakceptowany — zamówienie #${returnReq.orderDisplayId}`
			: status === "rejected"
				? `Wniosek odrzucony — zamówienie #${returnReq.orderDisplayId}`
				: `Aktualizacja wniosku — zamówienie #${returnReq.orderDisplayId}`;

	const body =
		status === "rejected" && extra?.rejectionReason
			? `Powód: ${extra.rejectionReason}`
			: `Status: ${status}`;

	return sendTransactionalEmail({
		to: returnReq.customerEmail,
		subject,
		text: body,
		html: `<p>${body}</p>`,
	});
}

export async function sendCaseCustomerEmail(input: {
	templateType: string;
	to: string;
	vars: CaseEmailVars;
	fallback: { subject: string; text: string; html: string };
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; message: string }> {
	return sendTransactionalEmail({
		to: input.to,
		subject: input.fallback.subject,
		text: input.fallback.text,
		html: input.fallback.html,
	});
}
