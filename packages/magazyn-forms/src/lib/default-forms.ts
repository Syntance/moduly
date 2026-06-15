import type {
	ContactFormDefinition,
	ContactFormsConfig,
	ContactFormTopicConfig,
	ContactTopicPreset,
} from "@moduly/types";
import {
	CONTACT_TOPIC_LABELS,
	CONTACT_TOPIC_PRESETS,
	type ContactTopicValue,
} from "./validation/contact";
import { getMagazynFormsConfig } from "../configure";

export type {
	ContactFormDefinition,
	ContactFormsConfig,
	ContactFormTopicConfig,
} from "@moduly/types";

function accessibilityInbox(): string {
	const cfg = getMagazynFormsConfig();
	return cfg.accessibilityEmail?.trim() || cfg.contactEmail;
}

function buildDefaultFormMeta(): Record<
	ContactTopicPreset,
	{ name: string; pages: string[]; recipientEmail: string }
> {
	const cfg = getMagazynFormsConfig();
	const p = cfg.customerPortalPaths;
	return {
		kontakt: {
			name: "Kontakt (strona główna)",
			pages: [cfg.contactPagePath, "/"],
			recipientEmail: cfg.contactEmail,
		},
		regulamin: {
			name: "Regulamin sklepu",
			pages: [p.regulations.startsWith("/") ? p.regulations : `/${p.regulations}`],
			recipientEmail: cfg.contactEmail,
		},
		privacy: {
			name: "Polityka prywatności",
			pages: [cfg.privacyPagePath],
			recipientEmail: cfg.contactEmail,
		},
		cookies: {
			name: "Polityka cookies",
			pages: [cfg.cookiesPagePath],
			recipientEmail: cfg.contactEmail,
		},
		withdrawal: {
			name: "Odstąpienie od umowy",
			pages: [p.withdrawal],
			recipientEmail: cfg.contactEmail,
		},
		claims: {
			name: "Reklamacje",
			pages: [p.claims],
			recipientEmail: cfg.contactEmail,
		},
		accessibility: {
			name: "Deklaracja dostępności",
			pages: [cfg.accessibilityPagePath],
			recipientEmail: accessibilityInbox(),
		},
		konto: {
			name: "Moje konto",
			pages: [p.account],
			recipientEmail: cfg.contactEmail,
		},
	};
}

export function buildDefaultTopicsForPreset(
	preset: ContactTopicPreset,
): ContactFormTopicConfig[] {
	return CONTACT_TOPIC_PRESETS[preset].map((value) => ({
		value,
		label: CONTACT_TOPIC_LABELS[value],
		enabled: true,
	}));
}

export function buildDefaultContactFormsConfig(): ContactFormsConfig {
	const presets = Object.keys(CONTACT_TOPIC_PRESETS) as ContactTopicPreset[];
	const meta = buildDefaultFormMeta();
	return {
		forms: presets.map((id) => {
			const m = meta[id];
			return {
				id,
				name: m.name,
				pages: [...m.pages],
				recipientEmail: m.recipientEmail,
				topics: buildDefaultTopicsForPreset(id),
				enabled: true,
			};
		}),
	};
}

export function getDefaultFormByPreset(
	preset: ContactTopicPreset,
): ContactFormDefinition {
	const found = buildDefaultContactFormsConfig().forms.find((f) => f.id === preset);
	if (!found) throw new Error(`Nieznany preset formularza: ${preset}`);
	return found;
}

export function resetTopicsToCodeDefaults(
	preset: ContactTopicPreset,
): ContactFormTopicConfig[] {
	return buildDefaultTopicsForPreset(preset).map((t) => ({
		...t,
		label:
			t.value in CONTACT_TOPIC_LABELS
				? CONTACT_TOPIC_LABELS[t.value as ContactTopicValue]
				: t.label,
	}));
}
