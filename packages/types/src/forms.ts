import type { ContactTopicPreset } from "./contact-topics";

export type { ContactTopicPreset, ContactTopicValue } from "./contact-topics";

export type ContactFormFieldType =
	| "text"
	| "email"
	| "tel"
	| "textarea"
	| "select"
	| "checkbox";

export type ContactFormFieldOption = {
	value: string;
	label: string;
};

export type ContactFormField = {
	id: string;
	name: string;
	label: string;
	type: ContactFormFieldType;
	required: boolean;
	placeholder?: string;
	options?: ContactFormFieldOption[];
};

export type ContactFormTopicConfig = {
	value: string;
	label: string;
	enabled: boolean;
};

/** Definicja formularza kontaktowego edytowalna w panelu (retrohouse). */
export type ContactFormDefinition = {
	id: ContactTopicPreset;
	name: string;
	pages: string[];
	recipientEmail: string;
	topics: ContactFormTopicConfig[];
	enabled: boolean;
};

export type ContactFormsConfig = {
	forms: ContactFormDefinition[];
};

/** Zgłoszenie z formularza kontaktowego. */
export type ContactSubmission = {
	id: string;
	caseNumber: string;
	formPreset: ContactTopicPreset;
	formName: string;
	customerName: string;
	customerEmail: string;
	topic: string;
	topicLabel: string;
	topicOther?: string;
	message: string;
	createdAt: string;
};

export type ContactSubmissionListItem = Pick<
	ContactSubmission,
	| "id"
	| "caseNumber"
	| "formPreset"
	| "formName"
	| "customerName"
	| "customerEmail"
	| "topicLabel"
	| "createdAt"
>;

export type CreateContactSubmissionInput = {
	caseNumber: string;
	formPreset: ContactTopicPreset;
	formName: string;
	customerName: string;
	customerEmail: string;
	topic: string;
	topicLabel: string;
	topicOther?: string;
	message: string;
};

export type ListContactSubmissionsOptions = {
	limit?: number;
	offset?: number;
};

/** @deprecated Użyj ContactSubmission — alias kompatybilności z DataStore. */
export type FormSubmissionFieldValue = string | boolean;

/** @deprecated Użyj ContactSubmission. */
export type FormSubmission = {
	id: string;
	formId: string;
	formSlug: string;
	fields: Record<string, FormSubmissionFieldValue>;
	ipHash?: string;
	userAgent?: string;
	createdAt: string;
};

/** @deprecated Użyj CreateContactSubmissionInput. */
export type CreateFormSubmissionInput = {
	formId: string;
	formSlug: string;
	fields: Record<string, FormSubmissionFieldValue>;
	ipHash?: string;
	userAgent?: string;
};

/** @deprecated Użyj ListContactSubmissionsOptions. */
export type ListSubmissionsOptions = ListContactSubmissionsOptions;
