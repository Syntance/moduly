"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import {
	sendContactConfirmationEmail,
	sendContactNotificationEmail,
} from "@moduly/magazyn-emails";
import { allocateContactCaseNumber } from "./lib/contact-case-number";
import { rateLimit } from "./lib/rate-limit";
import { createContactSubmission } from "./lib/submissions-store";
import {
	getContactFormByPreset,
	getContactFormsConfig,
} from "./store";
import {
	ContactSchema,
	CONTACT_TOPIC_PRESETS,
	type ContactTopicPreset,
} from "./lib/validation/contact";
import { getMagazynFormsConfig } from "./configure";

export type ContactState =
	| { status: "idle" }
	| { status: "error"; errors: Record<string, string>; message?: string }
	| {
			status: "success";
			topic: string;
			topicOther?: string;
			caseNumber: string;
	  };

function parseFormPreset(raw: FormDataEntryValue | null): ContactTopicPreset {
	const value = typeof raw === "string" ? raw : "";
	if (value in CONTACT_TOPIC_PRESETS) {
		return value as ContactTopicPreset;
	}
	return "kontakt";
}

function hashIp(ip: string): string {
	return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function submitContact(
	_prev: ContactState,
	formData: FormData,
): Promise<ContactState> {
	const headerList = await headers();
	const ip =
		headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	const limit = rateLimit(`contact:${hashIp(ip)}`, 5, 60_000);
	if (!limit.ok) {
		return {
			status: "error",
			errors: {},
			message: "Za dużo prób z tego adresu. Spróbuj ponownie za chwilę.",
		};
	}

	const formPreset = parseFormPreset(formData.get("formPreset"));

	const parsed = ContactSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		topic: formData.get("topic"),
		topicOther: formData.get("topicOther") || undefined,
		message: formData.get("message"),
	});

	if (!parsed.success) {
		const errors: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0];
			if (typeof key === "string" && !errors[key]) {
				errors[key] = issue.message;
			}
		}
		return { status: "error", errors };
	}

	const config = await getContactFormsConfig();
	const formDef = getContactFormByPreset(config, formPreset);
	if (!formDef.enabled) {
		return {
			status: "error",
			errors: {},
			message: `Ten formularz jest chwilowo niedostępny. Napisz bezpośrednio na ${getMagazynFormsConfig().contactEmail}.`,
		};
	}

	const allowedTopics = new Set(
		formDef.topics.filter((t) => t.enabled).map((t) => t.value),
	);
	if (!allowedTopics.has(parsed.data.topic)) {
		return {
			status: "error",
			errors: { topic: "Wybierz prawidłowy temat." },
		};
	}

	let caseNumber: string;
	try {
		caseNumber = await allocateContactCaseNumber();
	} catch {
		return {
			status: "error",
			errors: {},
			message: "Nie udało się nadać numeru sprawy. Spróbuj ponownie za chwilę.",
		};
	}


	const mail = await sendContactNotificationEmail(
		{
			name: parsed.data.name,
			email: parsed.data.email,
			phone: "",
			message: parsed.data.message,
		},
		caseNumber,
		"contact",
	);
	if (!mail.ok) {
		return { status: "error", errors: {}, message: mail.message };
	}

	const confirmation = await sendContactConfirmationEmail(
		{
			name: parsed.data.name,
			email: parsed.data.email,
			phone: "",
			message: parsed.data.message,
		},
		caseNumber,
		"contact",
	);
	if (!confirmation.ok) {
		return {
			status: "error",
			errors: {},
			message: confirmation.message,
		};
	}

	await createContactSubmission({
		caseNumber,
		formPreset,
		formName: formDef.name,
		customerName: parsed.data.name,
		customerEmail: parsed.data.email,
		topic: parsed.data.topic,
		topicOther: parsed.data.topicOther,
		message: parsed.data.message,
		topics: formDef.topics,
	});

	return {
		status: "success",
		topic: parsed.data.topic,
		topicOther: parsed.data.topicOther,
		caseNumber,
	};
}
