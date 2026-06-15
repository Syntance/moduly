import "server-only";

import { bankTransferMergeVars } from "./lib/bank-transfer";
import {
	buildOrderRenderContext,
	mergeSubject,
	type OrderRenderSource,
	renderTemplate,
} from "./render-template";
import { sendTransactionalEmail, type SendEmailResult } from "./send-transactional";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";
import { buildDefaultTemplate } from "./template-types";

/** Wysyła mail z danymi do przelewu tradycyjnego (szablon bank_transfer_pending). */
export async function sendBankTransferPendingEmail(
	order: OrderRenderSource,
): Promise<SendEmailResult> {
	const type = "bank_transfer_pending" as const;

	if (!(await isEmailTemplateEnabledForSend(type).catch(() => true))) {
		return { ok: true, skipped: true };
	}

	const template = (await getEmailTemplateForSend(type)) ?? buildDefaultTemplate(type);
	const base = buildOrderRenderContext(order);
	const ctx = {
		...base,
		vars: { ...base.vars, ...bankTransferMergeVars(order.displayId) },
	};
	const { html, text } = renderTemplate(template, ctx);
	const subject = mergeSubject(template.subject, ctx.vars);

	return sendTransactionalEmail({ to: order.email, subject, text, html });
}
