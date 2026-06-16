"use server";

import { revalidatePath } from "next/cache";
import type { ContactFormsConfig } from "@moduly/types";
import { getMagazynFormsConfig, requireFormsAdmin } from "./configure";
import { getContactFormsConfig, saveContactFormsConfig } from "./store";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateContactPaths(): void {
	const cfg = getMagazynFormsConfig();
	const base = cfg.basePath;
	revalidatePath(`${base}/panel/formularze`);
	revalidatePath(`${base}/panel/formularze/otrzymane`);
	revalidatePath(cfg.contactPagePath);
	revalidatePath(cfg.privacyPagePath);
	revalidatePath(cfg.cookiesPagePath);
	revalidatePath(cfg.accessibilityPagePath);
	revalidatePath(cfg.customerPortalPaths.regulations);
	revalidatePath(cfg.customerPortalPaths.account);
	revalidatePath(cfg.customerPortalPaths.claims);
	revalidatePath(cfg.customerPortalPaths.withdrawal);
}

export async function saveContactFormsAction(
	config: ContactFormsConfig,
): Promise<ActionResult> {
	try {
		await requireFormsAdmin();
		await saveContactFormsConfig(config);
		revalidateContactPaths();
		return { ok: true };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się zapisać.";
		return { ok: false, error: message };
	}
}

export async function reloadContactFormsAction(): Promise<ContactFormsConfig> {
	await requireFormsAdmin();
	return getContactFormsConfig();
}
