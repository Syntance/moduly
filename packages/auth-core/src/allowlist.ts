/**
 * Lista dozwolonych e-maili administratorów panelu (CSV w ENV
 * `MAGAZYN_ADMIN_ALLOWLIST`, np. "a@firma.pl,b@firma.pl").
 *
 * Pusta / nieustawiona = brak ograniczenia.
 */
export function getAdminAllowlist(env: NodeJS.ProcessEnv = process.env): string[] {
	const raw = env.MAGAZYN_ADMIN_ALLOWLIST?.trim();
	if (!raw) return [];
	return raw
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
}

/**
 * Czy dany e-mail może korzystać z panelu magazynu.
 *
 * - allowlista pusta → `true` (brak ograniczenia),
 * - allowlista ustawiona → tylko wymienione adresy.
 */
export function isAdminEmailAllowed(
	email: string | null | undefined,
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	const allow = getAdminAllowlist(env);
	if (allow.length === 0) return true;
	if (!email) return false;
	return allow.includes(email.trim().toLowerCase());
}
