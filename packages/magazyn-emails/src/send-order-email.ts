import "server-only";
import {
	buildOrderRenderContext,
	mergeSubject,
	type OrderRenderSource,
	renderTemplate,
} from "./render-template";
import { sendTransactionalEmail, type SendEmailResult } from "./send-transactional";
import { buildDefaultTemplate, type EmailTemplateType } from "./template-types";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";

/**
 * Wysyła mail danego etapu dla zamówienia.
 *
 * Najpierw szuka zapisanego w edytorze override; gdy go brak, używa
 * szablonu domyślnego z kodu (fallback). Podłącz to w pipeline zamówień,
 * np. w webhooku statusu albo akcji panelu (markOrderShipped → "shipped").
 */
export async function sendOrderStageEmail(
	type: EmailTemplateType,
	order: OrderRenderSource,
): Promise<SendEmailResult> {
	if (!(await isEmailTemplateEnabledForSend(type).catch(() => true))) {
		return { ok: true, skipped: true };
	}

	const template = (await getEmailTemplateForSend(type)) ?? buildDefaultTemplate(type);
	const ctx = buildOrderRenderContext(order);
	const { html, text } = renderTemplate(template, ctx);
	const subject = mergeSubject(template.subject, ctx.vars);

	return sendTransactionalEmail({ to: order.email, subject, text, html });
}
