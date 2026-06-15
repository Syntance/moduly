import "server-only";

import { requireDataStore } from "@moduly/data-store";
import type { ContactSubmission } from "@moduly/types";
import type { ContactFormTopicConfig } from "./default-forms";
import {
	CONTACT_TOPIC_LABELS,
	type ContactTopicPreset,
	type ContactTopicValue,
} from "./validation/contact";

export type { ContactSubmission } from "@moduly/types";

export function resolveTopicLabel(input: {
	topic: string;
	topicOther?: string;
	topics?: ContactFormTopicConfig[];
}): string {
	if (input.topic === "inne" && input.topicOther?.trim()) {
		return input.topicOther.trim();
	}
	const fromConfig = input.topics?.find((t) => t.value === input.topic)?.label;
	if (fromConfig) return fromConfig;
	if (input.topic in CONTACT_TOPIC_LABELS) {
		return CONTACT_TOPIC_LABELS[input.topic as ContactTopicValue];
	}
	return input.topic;
}

export async function createContactSubmission(data: {
	caseNumber: string;
	formPreset: ContactTopicPreset;
	formName: string;
	customerName: string;
	customerEmail: string;
	topic: string;
	topicOther?: string;
	message: string;
	topics: ContactFormTopicConfig[];
}): Promise<ContactSubmission> {
	const store = requireDataStore();
	return store.createContactSubmission({
		caseNumber: data.caseNumber,
		formPreset: data.formPreset,
		formName: data.formName,
		customerName: data.customerName,
		customerEmail: data.customerEmail,
		topic: data.topic,
		topicLabel: resolveTopicLabel({
			topic: data.topic,
			topicOther: data.topicOther,
			topics: data.topics,
		}),
		topicOther: data.topicOther,
		message: data.message,
	});
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
	const store = requireDataStore();
	return store.listContactSubmissions();
}

export async function getContactSubmissionById(
	id: string,
): Promise<ContactSubmission | undefined> {
	const store = requireDataStore();
	return store.getContactSubmission(id);
}

export async function listContactSubmissionsForEmail(
	email: string,
): Promise<ContactSubmission[]> {
	const store = requireDataStore();
	return store.listContactSubmissionsForEmail(email);
}
