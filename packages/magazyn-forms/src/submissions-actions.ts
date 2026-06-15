"use server";

import {
	getContactSubmissionById,
	listContactSubmissions,
} from "./lib/submissions-store";
import { requireFormsAdmin } from "./configure";

export async function getSubmissionsListAction() {
	try {
		await requireFormsAdmin();
		const submissions = await listContactSubmissions();
		return { ok: true as const, submissions };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się wczytać listy.";
		return { ok: false as const, error: message };
	}
}

export async function getSubmissionDetailAction(id: string) {
	try {
		await requireFormsAdmin();
		const submission = await getContactSubmissionById(id);
		if (!submission) {
			return { ok: false as const, error: "Nie znaleziono zgłoszenia." };
		}
		return { ok: true as const, submission };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Nie udało się wczytać szczegółów.";
		return { ok: false as const, error: message };
	}
}
