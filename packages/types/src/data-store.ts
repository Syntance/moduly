import type {
	ContentPageId,
	GlobalContent,
	PageContent,
	SeoMeta,
	SiteSettings,
} from "./content";
import type {
	ContactFormsConfig,
	ContactSubmission,
	CreateContactSubmissionInput,
	CreateFormSubmissionInput,
	FormSubmission,
	ListContactSubmissionsOptions,
	ListSubmissionsOptions,
} from "./forms";
import type {
	AdminReturnRow,
	CreateReturnInput,
	ListReturnsOptions,
	ReturnRequest,
	ReturnStatus,
	UpdateReturnStatusExtra,
} from "./returns";

export type AuditAction =
	| "content.update"
	| "settings.update"
	| "form.submission"
	| "return.create"
	| "return.status_update";

/** Wpis dziennika audytu — kto, co i kiedy zmienił w panelu. */
export type AuditEntry = {
	action: AuditAction;
	actorEmail: string;
	resourceType: string;
	resourceId: string;
	metadata?: Record<string, string | number | boolean>;
	createdAt: string;
};

/**
 * Abstrakcja persystencji danych panelu Moduly.
 * Implementacje: Postgres (Drizzle), Medusa module services.
 */
export interface DataStore {
	// --- Treść CMS ---
	getSiteSettings(): Promise<SiteSettings>;
	saveSiteSettings(settings: SiteSettings): Promise<void>;
	getPageContent(pageId: ContentPageId): Promise<PageContent | undefined>;
	savePageContent(pageId: ContentPageId, content: PageContent): Promise<void>;
	getPageSeo(pageId: ContentPageId): Promise<SeoMeta | undefined>;
	savePageSeo(pageId: ContentPageId, seo: SeoMeta): Promise<void>;
	getGlobalContent(): Promise<GlobalContent>;
	saveGlobalContent(content: GlobalContent): Promise<void>;

	// --- Formularze kontaktowe ---
	getFormsConfig(): Promise<ContactFormsConfig>;
	saveFormsConfig(config: ContactFormsConfig): Promise<void>;
	listContactSubmissions(
		options?: ListContactSubmissionsOptions,
	): Promise<ContactSubmission[]>;
	createContactSubmission(
		input: CreateContactSubmissionInput,
	): Promise<ContactSubmission>;
	getContactSubmission(
		submissionId: string,
	): Promise<ContactSubmission | undefined>;
	listContactSubmissionsForEmail(email: string): Promise<ContactSubmission[]>;
	allocateContactCaseNumber(prefix: string): Promise<string>;

	/** @deprecated Użyj listContactSubmissions. */
	listSubmissions(
		formId: string,
		options?: ListSubmissionsOptions,
	): Promise<FormSubmission[]>;
	/** @deprecated Użyj createContactSubmission. */
	createSubmission(input: CreateFormSubmissionInput): Promise<FormSubmission>;
	/** @deprecated Użyj getContactSubmission. */
	getSubmission(submissionId: string): Promise<FormSubmission | undefined>;

	// --- Zwroty i reklamacje ---
	listReturns(options?: ListReturnsOptions): Promise<AdminReturnRow[]>;
	getReturn(returnId: string): Promise<ReturnRequest | undefined>;
	createReturn(input: CreateReturnInput): Promise<ReturnRequest>;
	updateReturnStatus(
		returnId: string,
		status: ReturnStatus,
		extra?: UpdateReturnStatusExtra,
	): Promise<ReturnRequest>;
	getReturnsByCustomerEmail(email: string): Promise<ReturnRequest[]>;
	getActiveClaimForOrder(
		customerEmail: string,
		orderId: string,
	): Promise<ReturnRequest | undefined>;
	getActiveWithdrawalForOrder(
		customerEmail: string,
		orderId: string,
	): Promise<ReturnRequest | undefined>;

	// --- Audyt ---
	recordAudit(entry: AuditEntry): Promise<void>;
}
