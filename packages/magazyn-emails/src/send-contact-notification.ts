import "server-only";

import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	buildContactEmailRenderVars,
	type ContactEmailPayload,
} from "./contact-email-context";
import { mergeSubject, renderTemplate } from "./render-template";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";
import { sendTransactionalEmail } from "./send-transactional";
import {
	buildDefaultTemplate,
	getNotificationTypeForPreset,
	type ContactFormPreset,
} from "./template-types";

export type SendContactNotificationResult =
	| { ok: true; skipped?: boolean }
	| { ok: false; message: string };

function shopInbox(): string {
	return (
		process.env.SHOP_ORDER_NOTIFY_EMAIL?.replace(/\r\n/g, "").trim() ??
		process.env.CONTACT_INBOX_EMAIL?.replace(/\r\n/g, "").trim() ??
		getModulyConfig().email.contactEmail
	);
}

/** Powiadomienie na kontakt@lumineconcept.pl — szablon z panelu magazynu. */
export async function sendContactNotificationEmail(
	data: ContactEmailPayload,
	caseNumber: string,
	preset: ContactFormPreset = "contact",
	attachment?: { filename: string; contentBase64: string },
): Promise<SendContactNotificationResult> {
	const templateType = getNotificationTypeForPreset(preset);
	const inbox = shopInbox();
	if (!inbox) {
		return { ok: false, message: "Brak adresu sklepu do powiadomień." };
	}

	if (!(await isEmailTemplateEnabledForSend(templateType).catch(() => true))) {
		return { ok: true, skipped: true };
	}

	const vars = buildContactEmailRenderVars(data, caseNumber, preset);
	const ctx = { vars: { ...vars }, items: [] };

	const saved = await getEmailTemplateForSend(templateType).catch(() => null);
	const fallbackTemplate = buildDefaultTemplate(templateType);

	let subject: string;
	let text: string;
	let html: string;

	if (saved) {
		const rendered = renderTemplate(saved, ctx);
		subject = mergeSubject(saved.subject, ctx.vars);
		text = rendered.text;
		html = rendered.html;
	} else {
		subject = mergeSubject(fallbackTemplate.subject, ctx.vars);
		const rendered = renderTemplate(fallbackTemplate, ctx);
		text = rendered.text;
		html = rendered.html;
	}

	const result = await sendTransactionalEmail({
		to: inbox,
		subject,
		text,
		html,
		replyTo: data.email,
		attachments: attachment
			? [{ filename: attachment.filename, content: attachment.contentBase64 }]
			: undefined,
	});

	if (!result.ok) {
		return {
			ok: false,
			message: "Nie udało się wysłać powiadomienia do sklepu. Spróbuj ponownie.",
		};
	}

	return { ok: true, skipped: result.skipped };
}
