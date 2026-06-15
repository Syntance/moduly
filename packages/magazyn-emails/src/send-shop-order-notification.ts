import "server-only";

import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	buildOrderRenderContext,
	mergeSubject,
	type OrderRenderSource,
	renderTemplate,
} from "./render-template";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";
import { sendTransactionalEmail } from "./send-transactional";
import {
	buildDefaultTemplate,
	getInternalTemplateType,
	type OrderEmailTemplateType,
} from "./template-types";

function shopInbox(): string {
	return (
		process.env.SHOP_ORDER_NOTIFY_EMAIL?.replace(/\r\n/g, "").trim() ??
		process.env.CONTACT_INBOX_EMAIL?.replace(/\r\n/g, "").trim() ??
		getModulyConfig().email.contactEmail
	);
}

/**
 * Powiadomienie do kontakt@lumineconcept.pl po etapie zamówienia.
 * Para z szablonem klienta — edytowalna w magazynu (przełącznik „Do nas”).
 */
export async function sendShopOrderNotificationEmail(
	clientType: OrderEmailTemplateType,
	order: OrderRenderSource,
	paymentLabel: string,
): Promise<void> {
	const internalType = getInternalTemplateType(clientType);
	const inbox = shopInbox();
	if (!inbox) return;

	if (!(await isEmailTemplateEnabledForSend(internalType).catch(() => true))) {
		return;
	}

	const ctx = buildOrderRenderContext(order);
	ctx.vars.metodaPlatnosci = paymentLabel;

	const saved = await getEmailTemplateForSend(internalType).catch(() => null);
	const template = saved ?? buildDefaultTemplate(internalType);
	const { html, text } = renderTemplate(template, ctx);
	const subject = mergeSubject(template.subject, ctx.vars);

	await sendTransactionalEmail({
		to: inbox,
		subject,
		text,
		html,
		replyTo: order.email,
	}).catch(() => undefined);
}
