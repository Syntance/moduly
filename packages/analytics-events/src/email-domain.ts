/** Wyciąga domenę e-mail bez PII — do lead_submit. */
export function extractEmailDomain(email: string | null | undefined): string | undefined {
	if (!email) return undefined;
	const trimmed = email.trim().toLowerCase();
	const at = trimmed.lastIndexOf("@");
	if (at <= 0 || at === trimmed.length - 1) return undefined;
	const domain = trimmed.slice(at + 1);
	if (!domain.includes(".")) return undefined;
	return domain;
}
