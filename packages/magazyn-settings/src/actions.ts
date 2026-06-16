"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@moduly/magazyn-core";
import type { PanelNotificationSettings } from "@moduly/types";
import { getMagazynSettingsConfig } from "./configure";
import { panelSettingsSchema, savePanelSettings, getPanelSettings } from "./panel-settings-store";
import { requireSettingsAdmin } from "./configure";

export type SaveNotificationsState = {
	ok: boolean;
	error: string | null;
};

export async function saveNotificationSettingsAction(
	input: PanelNotificationSettings,
): Promise<SaveNotificationsState> {
	try {
		await requireSettingsAdmin();
		const cfg = getMagazynSettingsConfig();

		if (cfg.commerceBackend !== "medusa") {
			return { ok: false, error: "Zapis wymaga backendu Medusa." };
		}

		const notifications = panelSettingsSchema.shape.notifications.safeParse(input);
		if (!notifications.success) {
			return { ok: false, error: "Sprawdź poprawność adresów e-mail." };
		}

		const current = await getPanelSettings();
		await savePanelSettings({
			...current,
			notifications: notifications.data,
		});

		await recordAudit("settings.update", {
			target: "panel.notifications",
		});

		revalidatePath(`${cfg.basePath}/panel/ustawienia/powiadomienia`);
		return { ok: true, error: null };
	} catch {
		return { ok: false, error: "Nie udało się zapisać powiadomień. Spróbuj ponownie." };
	}
}
