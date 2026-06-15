import type { AuthProvider, AuthSession } from "@moduly/types";
import { isAdminEmailAllowed } from "./allowlist";

/** Błąd braku lub nieważnej sesji administratora. */
export class AdminSessionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AdminSessionError";
	}
}

/**
 * Twardo weryfikuje aktywną sesję administratora i allowlistę e-maili.
 * Używaj w Server Actions przed uprzywilejowanymi operacjami.
 */
export async function requireAdminSession(
	auth: AuthProvider,
	getToken: () => Promise<string | null>,
	env: NodeJS.ProcessEnv = process.env,
): Promise<AuthSession> {
	const token = await getToken();
	if (!token) {
		throw new AdminSessionError("Sesja wygasła. Zaloguj się ponownie.");
	}

	const session = await auth.validateSession(token);
	if (!session) {
		throw new AdminSessionError("Sesja wygasła. Zaloguj się ponownie.");
	}

	if (!isAdminEmailAllowed(session.email, env)) {
		throw new AdminSessionError("Konto nie ma dostępu do panelu.");
	}

	return session;
}
