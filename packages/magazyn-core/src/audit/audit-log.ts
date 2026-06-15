import "server-only";

import { adminFetch } from "../medusa/client";

/**
 * Lekki audit trail mutacji panelu (kto / co / kiedy).
 *
 * Zapisujemy jako USTRUKTURYZOWANY log serwera z prefiksem `[audit]` — jest
 * queryable w log drainie (Railway/Vercel) i NIE zanieczyszcza `Store.metadata`
 * (uniknięcie RMW-race z treściami CMS) ani nie wymaga nowej tabeli.
 */

export type AuditDetails = {
	target?: string;
	meta?: Record<string, unknown>;
};

async function resolveActor(): Promise<string> {
	try {
		const me = await adminFetch<{ user?: { email?: string } }>(
			"/admin/users/me?fields=id,email",
		);
		return me?.user?.email ?? "unknown";
	} catch {
		return "unknown";
	}
}

/**
 * Rejestruje zdarzenie audytowe. Best-effort i nieblokujące — błąd audytu nie
 * może wywrócić operacji biznesowej (np. usunięcia produktu).
 */
export async function recordAudit(action: string, details: AuditDetails = {}): Promise<void> {
	try {
		const actor = await resolveActor();
		console.info(
			`[audit] action=${action} actor=${actor} target=${details.target ?? "-"} at=${new Date().toISOString()}`,
			details.meta ?? {},
		);
	} catch {
		/* audyt nie może blokować operacji */
	}
}
