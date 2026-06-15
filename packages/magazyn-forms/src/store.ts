import "server-only";

import { z } from "zod";
import { requireDataStore } from "@moduly/data-store";
import type {
	ContactFormDefinition,
	ContactFormsConfig,
	ContactTopicPreset,
} from "@moduly/types";
import {
	buildDefaultContactFormsConfig,
	getDefaultFormByPreset,
} from "./lib/default-forms";
import {
	type ContactTopicValue,
} from "./lib/validation/contact";

const topicSchema = z.object({
	value: z.string().min(1),
	label: z.string().min(1).max(120),
	enabled: z.boolean(),
});

const formSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(120),
	pages: z.array(z.string().min(1)).min(1),
	recipientEmail: z.string().email(),
	topics: z.array(topicSchema).min(1),
	enabled: z.boolean(),
});

const configSchema = z.object({
	forms: z.array(formSchema).min(1),
});

function mergeWithDefaults(saved: ContactFormsConfig): ContactFormsConfig {
	const defaults = buildDefaultContactFormsConfig();
	if (!saved.forms?.length) return defaults;

	const byId = new Map(saved.forms.map((f) => [f.id, f]));
	return {
		forms: defaults.forms.map((def) => {
			const override = byId.get(def.id);
			if (!override) return def;
			const topicMap = new Map(override.topics.map((t) => [t.value, t]));
			const topics = def.topics.map((base) => topicMap.get(base.value) ?? base);
			for (const t of override.topics) {
				if (!topics.some((x) => x.value === t.value)) {
					topics.push(t);
				}
			}
			return {
				...def,
				name: override.name || def.name,
				pages: override.pages.length > 0 ? override.pages : def.pages,
				recipientEmail: override.recipientEmail || def.recipientEmail,
				enabled: override.enabled,
				topics,
			};
		}),
	};
}

export async function getContactFormsConfig(): Promise<ContactFormsConfig> {
	const store = requireDataStore();
	const saved = await store.getFormsConfig();
	return mergeWithDefaults(saved);
}

export async function saveContactFormsConfig(
	config: ContactFormsConfig,
): Promise<void> {
	const parsed = configSchema.safeParse(config);
	if (!parsed.success) {
		throw new Error("Nieprawidłowa konfiguracja formularzy.");
	}
	const store = requireDataStore();
	await store.saveFormsConfig(parsed.data as ContactFormsConfig);
}

export function getContactFormByPreset(
	config: ContactFormsConfig,
	preset: ContactTopicPreset,
): ContactFormDefinition {
	const found = config.forms.find((f) => f.id === preset);
	if (found) return found;
	return getDefaultFormByPreset(preset);
}

export function getContactTopicOptionsFromConfig(
	config: ContactFormsConfig,
	preset: ContactTopicPreset,
): Array<{ value: ContactTopicValue; label: string }> {
	const form = getContactFormByPreset(config, preset);
	if (!form.enabled) return [];
	return form.topics
		.filter((t) => t.enabled)
		.map((t) => ({ value: t.value as ContactTopicValue, label: t.label }));
}

export function getRecipientEmailForPreset(
	config: ContactFormsConfig,
	preset: ContactTopicPreset,
): string {
	return getContactFormByPreset(config, preset).recipientEmail;
}

export { resetTopicsToCodeDefaults } from "./lib/default-forms";
