"use server";

import { revalidatePath } from "next/cache";
import { sendReturnStatusCustomerEmail } from "@moduly/magazyn-emails";
import type { ReturnStatus, UpdateReturnStatusExtra } from "@moduly/types";
import { getMagazynReturnsConfig, requireReturnsAdmin } from "./configure";
import {
	getAllReturns,
	getReturnById,
	updateReturnStatus,
} from "./store";

export async function getReturnsListAction() {
	try {
		await requireReturnsAdmin();
		const returns = await getAllReturns();
		return { ok: true as const, returns };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się pobrać zwrotów.";
		return { ok: false as const, error: message };
	}
}

export async function getReturnDetailAction(id: string) {
	try {
		await requireReturnsAdmin();
		const returnReq = await getReturnById(id);
		if (!returnReq) {
			return { ok: false as const, error: "Nie znaleziono zwrotu" };
		}
		return { ok: true as const, return: returnReq };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Błąd pobierania zwrotu.";
		return { ok: false as const, error: message };
	}
}

export async function updateReturnStatusAction(
	id: string,
	status: ReturnStatus,
	extra?: UpdateReturnStatusExtra,
) {
	try {
		await requireReturnsAdmin();
		await updateReturnStatus(id, status, extra);

		const returnReq = await getReturnById(id);
		if (returnReq) {
			await sendReturnStatusCustomerEmail(returnReq, status, extra);
		}

		revalidatePath(`${getMagazynReturnsConfig().basePath}/zwroty`);
		return { ok: true as const };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się zaktualizować statusu.";
		return { ok: false as const, error: message };
	}
}
