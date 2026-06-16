import "server-only";

import { MAGAZYN_PANEL_SETTINGS_KEY } from "@moduly/cms/metadata-keys";
import { adminFetch } from "@moduly/magazyn-core";
import type { PanelNotificationSettings, PanelSettings } from "@moduly/types";
import { z } from "zod";
import { getMagazynSettingsConfig } from "./configure";

const notificationSchema = z.object({
	orderEmail: z.string().email("Podaj poprawny adres e-mail.").optional().or(z.literal("")),
	lowStockEmail: z.string().email("Podaj poprawny adres e-mail.").optional().or(z.literal("")),
	formEmail: z.string().email("Podaj poprawny adres e-mail.").optional().or(z.literal("")),
	returnsEmail: z.string().email("Podaj poprawny adres e-mail.").optional().or(z.literal("")),
});

export const panelSettingsSchema = z.object({
	notifications: notificationSchema.optional(),
});

type MedusaStore = { id: string; metadata?: Record<string, unknown> | null };

async function getMedusaStore(): Promise<MedusaStore | null> {
	if (getMagazynSettingsConfig().commerceBackend !== "medusa") return null;
	try {
		const data = await adminFetch<{ stores: MedusaStore[] }>(
			"/admin/stores?limit=1&fields=id,metadata",
		);
		return data.stores[0] ?? null;
	} catch {
		return null;
	}
}

function parsePanelSettings(raw: unknown): PanelSettings {
	const parsed = panelSettingsSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

export async function getPanelSettings(): Promise<PanelSettings> {
	const store = await getMedusaStore();
	if (!store) return {};
	const raw = store.metadata?.[MAGAZYN_PANEL_SETTINGS_KEY];
	if (typeof raw === "string") {
		try {
			return parsePanelSettings(JSON.parse(raw));
		} catch {
			return {};
		}
	}
	return parsePanelSettings(raw);
}

export async function savePanelSettings(settings: PanelSettings): Promise<void> {
	const parsed = panelSettingsSchema.parse(settings);
	const store = await getMedusaStore();
	if (!store) {
		throw new Error("Zapis ustawień wymaga backendu Medusa.");
	}

	const nextMetadata = { ...(store.metadata ?? {}) } as Record<string, unknown>;
	nextMetadata[MAGAZYN_PANEL_SETTINGS_KEY] = JSON.stringify(parsed);

	await adminFetch(`/admin/stores/${store.id}`, {
		method: "POST",
		body: JSON.stringify({ metadata: nextMetadata }),
	});
}

export function resolveNotificationEmails(
	panel: PanelSettings,
	fallbackEmail: string,
): Required<PanelNotificationSettings> {
	const n = panel.notifications ?? {};
	const pick = (value: string | undefined) => value?.trim() || fallbackEmail;
	return {
		orderEmail: pick(n.orderEmail),
		lowStockEmail: pick(n.lowStockEmail),
		formEmail: pick(n.formEmail),
		returnsEmail: pick(n.returnsEmail),
	};
}
