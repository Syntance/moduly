import type { ContactFormPreset } from "./template-types";

export type ContactEmailPayload = {
	name: string;
	email: string;
	phone: string;
	message: string;
	attachmentFilename?: string;
};

export type ContactEmailRenderVars = {
	imie: string;
	email: string;
	temat: string;
	numerSprawy: string;
	numerFormularza: string;
	wiadomosc: string;
	telefon: string;
	wiadomoscPelna: string;
	zalacznik: string;
};

const MESSAGE_PREVIEW_MAX = 400;

function truncateMessage(message: string): string {
	const trimmed = message.trim();
	if (trimmed.length <= MESSAGE_PREVIEW_MAX) return trimmed;
	return `${trimmed.slice(0, MESSAGE_PREVIEW_MAX)}…`;
}

function topicForPreset(preset: ContactFormPreset): string {
	return preset === "logo3d" ? "Tablica z logo — wycena" : "Formularz kontaktowy";
}

/** Generuje numer sprawy formularza kontaktowego (FK-RRRR-NNNNN). */
export function createContactCaseNumber(now = new Date()): string {
	const year = now.getFullYear();
	const suffix = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
	return `FK-${year}-${suffix}`;
}

export function buildContactEmailRenderVars(
	data: ContactEmailPayload,
	caseNumber: string,
	preset: ContactFormPreset = "contact",
): ContactEmailRenderVars {
	const attachment = data.attachmentFilename?.trim() || "—";
	return {
		imie: data.name,
		email: data.email,
		temat: topicForPreset(preset),
		numerSprawy: caseNumber,
		numerFormularza: caseNumber,
		wiadomosc: truncateMessage(data.message),
		telefon: data.phone?.trim() || "—",
		wiadomoscPelna: data.message.trim(),
		zalacznik: attachment,
	};
}
