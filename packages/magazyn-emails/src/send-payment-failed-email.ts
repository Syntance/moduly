import "server-only";

import {
	buildOrderRenderContext,
	mergeSubject,
	type OrderRenderSource,
	renderTemplate,
} from "./render-template";
import { sendTransactionalEmail, type SendEmailResult } from "./send-transactional";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";
import { buildDefaultTemplate } from "./template-types";

/** Wysyła mail o nieudanej płatności online (szablon payment_failed). */
export async function sendPaymentFailedEmail(
	order: OrderRenderSource,
	retryPaymentUrl: string,
	cartReference?: string,
): Promise<SendEmailResult> {
	const type = "payment_failed" as const;

	if (!(await isEmailTemplateEnabledForSend(type).catch(() => true))) {
		return { ok: true, skipped: true };
	}

	const template = (await getEmailTemplateForSend(type)) ?? buildDefaultTemplate(type);
	const base = buildOrderRenderContext(order);
	const ctx = {
		...base,
		vars: {
			...base.vars,
			linkPlatnosci: retryPaymentUrl,
			...(cartReference ? { nrZamowienia: cartReference } : {}),
		},
	};
	const { html, text } = renderTemplate(template, ctx);
	const subject = mergeSubject(template.subject, ctx.vars);

	return sendTransactionalEmail({ to: order.email, subject, text, html });
}
