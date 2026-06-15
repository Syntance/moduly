import "server-only";

import {
	buildContactEmailRenderVars,
	type ContactEmailPayload,
} from "./contact-email-context";
import { mergeSubject, renderTemplate } from "./render-template";
import { getEmailTemplateForSend, isEmailTemplateEnabledForSend } from "./store";
import { sendTransactionalEmail } from "./send-transactional";
import {
	buildDefaultTemplate,
	getConfirmationTypeForPreset,
	type ContactFormPreset,
} from "./template-types";

export type SendContactConfirmationResult =
	| { ok: true; skipped?: boolean }
	| { ok: false; message: string };

/** Potwierdzenie dla klienta — szablon z panelu magazynu. */
export async function sendContactConfirmationEmail(
	data: ContactEmailPayload,
	caseNumber: string,
	preset: ContactFormPreset = "contact",
): Promise<SendContactConfirmationResult> {
	const templateType = getConfirmationTypeForPreset(preset);

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
		to: data.email,
		subject,
		text,
		html,
	});

	if (!result.ok) {
		return {
			ok: false,
			message: "Nie udało się wysłać potwierdzenia na Twój e-mail. Spróbuj ponownie za chwilę.",
		};
	}

	return { ok: true, skipped: result.skipped };
}
