import "server-only";
import { isAdminEmailAllowed } from "@moduly/auth-core";
import { adminFetch } from "../medusa/client";
import { AdminUnauthorizedError } from "../medusa/errors";

/**
 * Twardo weryfikuje ważną sesję panelu i allowlistę e-maili (`MAGAZYN_ADMIN_ALLOWLIST`).
 * Używaj przed operacjami poza `adminFetch` (upload R2, wysyłka maili).
 */
export async function requireAdminSession(): Promise<void> {
	const data = await adminFetch<{ user?: { email?: string } }>(
		"/admin/users/me?fields=id,email",
	);
	if (!isAdminEmailAllowed(data?.user?.email)) {
		throw new AdminUnauthorizedError("Konto nie ma dostępu do panelu.");
	}
}
