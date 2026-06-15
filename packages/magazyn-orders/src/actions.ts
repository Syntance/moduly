"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import {
	cancelOrder,
	completeOrder,
	getAdminOrderForEmail,
	markOrderDelivered,
	markOrderShipped,
	orderToEmailSource,
	startOrderRealization,
} from "./store";

export type OrderActionState = { error: string | null; ok: boolean };

export type OrderActionType = "capture" | "ship" | "deliver" | "complete" | "cancel";

const HANDLERS: Record<OrderActionType, (orderId: string) => Promise<void>> = {
	capture: startOrderRealization,
	ship: markOrderShipped,
	deliver: markOrderDelivered,
	complete: completeOrder,
	cancel: cancelOrder,
};

/** Mapowanie akcji → etap maila (zob. moduł emails). Akcje bez maila pomijamy. */
const ACTION_EMAIL: Partial<
	Record<OrderActionType, "realization_started" | "shipped" | "completed" | "cancelled">
> = {
	capture: "realization_started",
	ship: "shipped",
	complete: "completed",
	cancel: "cancelled",
};

const ORDERS_PATH = `${getModulyConfig().basePath}/panel/zamowienia`;

/** Wysyła mail etapu — best-effort, tylko gdy moduł emails jest włączony. */
async function notifyStage(orderId: string, action: OrderActionType): Promise<void> {
	if (!getModulyConfig().modules.emails) return;
	const stage = ACTION_EMAIL[action];
	if (!stage) return; // akcja bez powiadomienia mailowego (np. „dostarczone")
	try {
		const order = await getAdminOrderForEmail(orderId);
		if (!order) return;
		const { sendOrderStageEmail } = await import("@moduly/magazyn-emails");
		await sendOrderStageEmail(stage, orderToEmailSource(order));
	} catch {
		// Mail to powiadomienie — nie blokujemy operacji na zamówieniu.
	}
}

export async function runOrderAction(orderId: string, action: OrderActionType): Promise<OrderActionState> {
	const handler = HANDLERS[action];
	if (!handler) return { ok: false, error: "Nieznana akcja." };

	try {
		await handler(orderId);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		if (error instanceof Error) return { ok: false, error: error.message };
		return { ok: false, error: "Operacja nie powiodła się." };
	}

	revalidatePath(ORDERS_PATH);
	revalidatePath(`${ORDERS_PATH}/${orderId}`);
	revalidatePath(getModulyConfig().basePath);

	await notifyStage(orderId, action);

	return { ok: true, error: null };
}
