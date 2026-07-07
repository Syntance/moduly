/** Domyślny nadawca Resend — domena musi być zweryfikowana w panelu Resend. */
export const RESEND_DEFAULT_FROM = "Moduly Concept <kontakt@modulyconcept.pl>";

export const RESEND_DEFAULT_REPLY_TO = "kontakt@modulyconcept.pl";

export const RESEND_DEFAULT_CONTACT_EMAIL = "kontakt@modulyconcept.pl";

function trimEnv(value: string | undefined): string | undefined {
	const trimmed = value?.replace(/\r\n/g, "").trim();
	return trimmed || undefined;
}

export type ResendRuntimeConfig = {
	apiKey: string | undefined;
	from: string;
	replyTo: string;
	configured: boolean;
};

/** Normalizuje `RESEND_FROM` / sam adres e-mail → pełny nagłówek From. */
export function resolveResendFromAddress(
	fromRaw?: string,
	emailRaw?: string,
	fromName = "Moduly Concept",
): string {
	const from = trimEnv(fromRaw);
	if (from) {
		if (from.includes("<")) return from;
		return `${fromName} <${from}>`;
	}
	const email = trimEnv(emailRaw) ?? RESEND_DEFAULT_CONTACT_EMAIL;
	return `${fromName} <${email}>`;
}

export function getResendConfig(fromName = "Moduly Concept"): ResendRuntimeConfig {
	const apiKey = trimEnv(process.env.RESEND_API_KEY);
	const from = resolveResendFromAddress(
		process.env.RESEND_FROM,
		process.env.RESEND_FROM_EMAIL,
		fromName,
	);
	const replyTo =
		trimEnv(process.env.RESEND_REPLY_TO) ??
		trimEnv(process.env.CONTACT_INBOX_EMAIL) ??
		RESEND_DEFAULT_REPLY_TO;

	return {
		apiKey,
		from,
		replyTo,
		configured: Boolean(apiKey),
	};
}
