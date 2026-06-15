import "server-only";

import { requireDataStore } from "@moduly/data-store";
import { getMagazynFormsConfig } from "../configure";

/** Numer sprawy formularza kontaktowego: {prefix}-2026-00042 */
export async function allocateContactCaseNumber(): Promise<string> {
	const store = requireDataStore();
	const prefix = getMagazynFormsConfig().caseNumberPrefix.trim() || "FK";
	return store.allocateContactCaseNumber(prefix);
}
