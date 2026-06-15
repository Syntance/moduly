"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import { requireAdminSession } from "@moduly/magazyn-core";
import { uploadCmsAssetFile } from "@moduly/magazyn-core";
import { resetEmailTemplate, saveEmailTemplate, setEmailTemplateEnabled } from "./store";
import { mergeSubject, renderTemplate, sampleRenderContextForTemplate } from "./render-template";
import { sendTransactionalEmail } from "./send-transactional";
import {
	type EmailTemplate,
	emailTemplateSchema,
	emailTemplateTypeSchema,
} from "./template-types";

export type EmailActionState = { ok: boolean; error: string | null };
export type ResetActionState = EmailActionState & { template?: EmailTemplate };
export type ToggleEnabledActionState = EmailActionState & { template?: EmailTemplate };
export type UploadActionState = EmailActionState & { url?: string };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAILE_PATH = `${getModulyConfig().basePath}/panel/maile`;

function handleError(error: unknown, fallback: string): EmailActionState {
	if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
	if (error instanceof AdminApiError) return { ok: false, error: error.message };
	if (error instanceof Error) return { ok: false, error: error.message };
	return { ok: false, error: fallback };
}

export async function saveTemplateAction(template: unknown): Promise<EmailActionState> {
	const parsed = emailTemplateSchema.safeParse(template);
	if (!parsed.success) return { ok: false, error: "Szablon zawiera nieprawidłowe dane." };

	try {
		await saveEmailTemplate(parsed.data);
	} catch (error) {
		return handleError(error, "Nie udało się zapisać szablonu.");
	}

	revalidatePath(MAILE_PATH);
	return { ok: true, error: null };
}

const toggleEnabledSchema = z.object({
	type: emailTemplateTypeSchema,
	enabled: z.boolean(),
});

export async function setTemplateEnabledAction(input: unknown): Promise<ToggleEnabledActionState> {
	const parsed = toggleEnabledSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane przełącznika." };

	try {
		const template = await setEmailTemplateEnabled(parsed.data.type, parsed.data.enabled);
		revalidatePath(MAILE_PATH);
		return { ok: true, error: null, template };
	} catch (error) {
		return handleError(error, "Nie udało się zapisać ustawienia wysyłki.");
	}
}

export async function resetTemplateAction(type: unknown): Promise<ResetActionState> {
	const parsed = emailTemplateTypeSchema.safeParse(type);
	if (!parsed.success) return { ok: false, error: "Nieznany typ szablonu." };

	try {
		const template = await resetEmailTemplate(parsed.data);
		revalidatePath(MAILE_PATH);
		return { ok: true, error: null, template };
	} catch (error) {
		return handleError(error, "Nie udało się przywrócić szablonu.");
	}
}

export async function uploadEmailImageAction(formData: FormData): Promise<UploadActionState> {
	const file = formData.get("file");
	if (!(file instanceof File)) return { ok: false, error: "Brak pliku." };
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return { ok: false, error: "Dozwolone formaty: JPG, PNG, WEBP, GIF, AVIF." };
	}
	if (file.size > MAX_IMAGE_BYTES) {
		return { ok: false, error: "Maksymalny rozmiar obrazu to 10 MB." };
	}

	try {
		await requireAdminSession();
		const result = await uploadCmsAssetFile(file);
		return { ok: true, error: null, url: result.url };
	} catch (error) {
		return handleError(error, "Upload obrazu nie powiódł się.");
	}
}

const testSchema = z.object({
	to: z.string().email("Podaj poprawny adres e-mail."),
	template: emailTemplateSchema,
});

export async function sendTestEmailAction(input: unknown): Promise<EmailActionState> {
	const parsed = testSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane." };

	try {
		await requireAdminSession();
		const template = parsed.data.template;
		const ctx = sampleRenderContextForTemplate(template.type);
		const { html, text } = renderTemplate(template, ctx);
		const subject = `[TEST] ${mergeSubject(template.subject, ctx.vars)}`;
		const result = await sendTransactionalEmail({ to: parsed.data.to, subject, text, html });
		if (!result.ok) return { ok: false, error: result.message };
		if (result.skipped) {
			return { ok: false, error: "Brak RESEND_API_KEY — test pominięty (skonfiguruj klucz)." };
		}
		return { ok: true, error: null };
	} catch (error) {
		return handleError(error, "Nie udało się wysłać testu.");
	}
}
