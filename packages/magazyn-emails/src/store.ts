import "server-only";
import { adminFetch, serviceAdminFetch } from "@moduly/magazyn-core";
import {
	buildDefaultTemplate,
	EMAIL_TEMPLATE_TYPES,
	ORDER_INTERNAL_TEMPLATE_TYPES,
	type EmailTemplate,
	type EmailTemplateType,
	emailTemplateSchema,
	isEmailTemplateEnabled,
	parseTemplate,
} from "./template-types";

const METADATA_KEY = "email_templates";

type MedusaStore = { id: string; metadata?: Record<string, unknown> | null };

async function getStore(): Promise<MedusaStore> {
	const data = await adminFetch<{ stores: MedusaStore[] }>(
		"/admin/stores?limit=1&fields=id,metadata",
	);
	const store = data.stores[0];
	if (!store) throw new Error("Nie znaleziono sklepu w Medusa.");
	return store;
}

/** Parsuje mapę szablonów z metadanych; nieprawidłowe wpisy są pomijane. */
function parseMap(raw: unknown): Record<string, EmailTemplate> {
	if (typeof raw !== "string" || !raw.trim()) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const out: Record<string, EmailTemplate> = {};
		for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
			const template = parseTemplate(value);
			if (template) out[key] = template;
		}
		return out;
	} catch {
		return {};
	}
}

async function writeMap(store: MedusaStore, map: Record<string, EmailTemplate>): Promise<void> {
	await adminFetch(`/admin/stores/${store.id}`, {
		method: "POST",
		body: JSON.stringify({
			metadata: { ...(store.metadata ?? {}), [METADATA_KEY]: JSON.stringify(map) },
		}),
	});
}

/** Wszystkie szablony do edytora — zapisany lub domyślny gdy brak. */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
	const store = await getStore();
	const map = parseMap(store.metadata?.[METADATA_KEY]);
	const allTypes: EmailTemplateType[] = [
		...EMAIL_TEMPLATE_TYPES.map(({ type }) => type),
		...ORDER_INTERNAL_TEMPLATE_TYPES,
	];
	return allTypes.map((type) => map[type] ?? buildDefaultTemplate(type));
}

/** Czy automatyczna wysyłka danego typu jest włączona (brak wpisu = włączone). */
export async function isEmailTemplateEnabledForSend(
	type: EmailTemplateType,
): Promise<boolean> {
	const data = await serviceAdminFetch<{ stores: MedusaStore[] }>(
		"/admin/stores?limit=1&fields=id,metadata",
	);
	const raw = data?.stores?.[0]?.metadata?.[METADATA_KEY];
	const map = parseMap(raw);
	return isEmailTemplateEnabled(map[type] ?? null);
}

/** Włącza lub wyłącza wysyłkę bez edycji treści (zapisuje domyślny lub istniejący szablon). */
export async function setEmailTemplateEnabled(
	type: EmailTemplateType,
	enabled: boolean,
): Promise<EmailTemplate> {
	const store = await getStore();
	const map = parseMap(store.metadata?.[METADATA_KEY]);
	const base = map[type] ?? buildDefaultTemplate(type);
	const next: EmailTemplate = { ...base, enabled };
	map[type] = next;
	await writeMap(store, map);
	return next;
}

/** Zapisuje pojedynczy szablon (merge do istniejącej mapy). */
export async function saveEmailTemplate(template: EmailTemplate): Promise<void> {
	const parsed = emailTemplateSchema.safeParse(template);
	if (!parsed.success) throw new Error("Nieprawidłowy szablon maila.");

	const store = await getStore();
	const map = parseMap(store.metadata?.[METADATA_KEY]);
	map[parsed.data.type] = parsed.data;
	await writeMap(store, map);
}

/** Przywraca domyślny szablon (usuwa zapisany override z metadanych). */
export async function resetEmailTemplate(type: EmailTemplateType): Promise<EmailTemplate> {
	const store = await getStore();
	const map = parseMap(store.metadata?.[METADATA_KEY]);
	delete map[type];
	await writeMap(store, map);
	return buildDefaultTemplate(type);
}

/**
 * Szablon do realnej wysyłki (pipeline). Konto serwisowe (MEDUSA_ADMIN_*),
 * więc działa też bez sesji panelu. Zwraca null gdy brak zapisanego override.
 */
export async function getEmailTemplateForSend(
	type: EmailTemplateType,
): Promise<EmailTemplate | null> {
	const data = await serviceAdminFetch<{ stores: MedusaStore[] }>(
		"/admin/stores?limit=1&fields=id,metadata",
	);
	const raw = data?.stores?.[0]?.metadata?.[METADATA_KEY];
	const map = parseMap(raw);
	return map[type] ?? null;
}
