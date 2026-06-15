import type {
	AdminReturnRow,
	AuditEntry,
	ContactFormsConfig,
	ContactSubmission,
	ContentPageId,
	CreateContactSubmissionInput,
	CreateFormSubmissionInput,
	CreateReturnInput,
	DataStore,
	FormSubmission,
	GlobalContent,
	ListContactSubmissionsOptions,
	ListReturnsOptions,
	ListSubmissionsOptions,
	PageContent,
	ReturnRequest,
	ReturnStatus,
	SeoMeta,
	SiteSettings,
	UpdateReturnStatusExtra,
} from "@moduly/types";
import { and, desc, eq } from "drizzle-orm";
import type { PostgresClient } from "./client";
import {
	auditLog,
	contactSubmissions,
	counters,
	formDefinitions,
	formSubmissions,
	globalContent,
	pageContent,
	pageSeo,
	returnLineItems,
	returnRequests,
	siteSettings,
} from "./schema";

const SETTINGS_ROW_ID = "default";
const GLOBAL_ROW_ID = "default";
const FORMS_ROW_ID = "default";
const CASE_COUNTER_KEY = "contact_case";

const DEFAULT_SITE_SETTINGS: SiteSettings = {
	title: "",
	description: "",
};

const DEFAULT_GLOBAL_CONTENT: GlobalContent = {};

const DEFAULT_FORMS_CONFIG: ContactFormsConfig = {
	forms: [],
};

const ACTIVE_STATUSES = [
	"pending_approval",
	"approved",
	"shipped",
	"received",
] as const satisfies readonly ReturnStatus[];

/** Błąd konfliktu wersji przy zapisie ustawień witryny. */
export class SiteSettingsConflictError extends Error {
	constructor() {
		super(
			"Ustawienia zostały zmienione przez inną sesję. Odśwież stronę i spróbuj ponownie.",
		);
		this.name = "SiteSettingsConflictError";
	}
}

function mapContactSubmissionRow(
	row: typeof contactSubmissions.$inferSelect,
): ContactSubmission {
	return {
		id: row.id,
		caseNumber: row.caseNumber,
		formPreset: row.formPreset,
		formName: row.formName,
		customerName: row.customerName,
		customerEmail: row.customerEmail,
		topic: row.topic,
		topicLabel: row.topicLabel,
		topicOther: row.topicOther ?? undefined,
		message: row.message,
		createdAt: row.createdAt,
	};
}

function mapReturnRow(
	row: typeof returnRequests.$inferSelect,
	items: (typeof returnLineItems.$inferSelect)[],
): ReturnRequest {
	return {
		id: row.id,
		requestType: row.type as ReturnRequest["requestType"],
		orderId: row.orderId,
		orderDisplayId: row.orderDisplayId ?? 0,
		customerEmail: row.customerEmail,
		status: row.status as ReturnStatus,
		reason: row.reason,
		claimRemedy: (row.remedy as ReturnRequest["claimRemedy"]) ?? null,
		claimReferenceId: row.claimReferenceId ?? null,
		items: items.map((item) => ({
			orderLineItemId: item.lineItemId,
			productTitle: item.productTitle,
			quantity: item.quantity,
			unitPrice: item.unitPrice ?? item.refundAmount ?? 0,
			thumbnail: item.thumbnail ?? null,
		})),
		totalToRefund: row.totalToRefund ?? 0,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		approvedAt: row.approvedAt ?? null,
		shippedAt: row.shippedAt ?? null,
		receivedAt: row.receivedAt ?? null,
		refundedAt: row.refundedAt ?? null,
		rejectedAt: row.rejectedAt ?? null,
		rejectionReason: row.rejectionReason ?? null,
		adminNotes: row.adminNote ?? null,
	};
}

function isActiveReturn(status: ReturnStatus): boolean {
	return (ACTIVE_STATUSES as readonly ReturnStatus[]).includes(status);
}

/** Implementacja `DataStore` oparta o Postgres + Drizzle ORM. */
export class PostgresStore implements DataStore {
	constructor(private readonly client: PostgresClient) {}

	private get db() {
		return this.client.db;
	}

	async getSiteSettings(): Promise<SiteSettings> {
		const [row] = await this.db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.id, SETTINGS_ROW_ID))
			.limit(1);

		if (!row) return DEFAULT_SITE_SETTINGS;
		return row.data as SiteSettings;
	}

	async saveSiteSettings(settings: SiteSettings): Promise<void> {
		const now = new Date().toISOString();
		const [existing] = await this.db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.id, SETTINGS_ROW_ID))
			.limit(1);

		if (!existing) {
			await this.db.insert(siteSettings).values({
				id: SETTINGS_ROW_ID,
				data: settings,
				version: 1,
				updatedAt: now,
			});
			return;
		}

		const result = await this.db
			.update(siteSettings)
			.set({
				data: settings,
				version: existing.version + 1,
				updatedAt: now,
			})
			.where(
				and(
					eq(siteSettings.id, SETTINGS_ROW_ID),
					eq(siteSettings.version, existing.version),
				),
			)
			.returning({ id: siteSettings.id });

		if (result.length === 0) {
			throw new SiteSettingsConflictError();
		}
	}

	async getPageContent(
		pageId: ContentPageId,
	): Promise<PageContent | undefined> {
		const [row] = await this.db
			.select()
			.from(pageContent)
			.where(eq(pageContent.pageId, pageId))
			.limit(1);

		if (!row) return undefined;
		return row.content;
	}

	async savePageContent(
		pageId: ContentPageId,
		content: PageContent,
	): Promise<void> {
		const now = new Date().toISOString();
		await this.db
			.insert(pageContent)
			.values({ pageId, content, updatedAt: now })
			.onConflictDoUpdate({
				target: pageContent.pageId,
				set: { content, updatedAt: now },
			});
	}

	async getPageSeo(pageId: ContentPageId): Promise<SeoMeta | undefined> {
		const [row] = await this.db
			.select()
			.from(pageSeo)
			.where(eq(pageSeo.pageId, pageId))
			.limit(1);

		if (!row) return undefined;
		return row.seo;
	}

	async savePageSeo(pageId: ContentPageId, seo: SeoMeta): Promise<void> {
		const now = new Date().toISOString();
		await this.db
			.insert(pageSeo)
			.values({ pageId, seo, updatedAt: now })
			.onConflictDoUpdate({
				target: pageSeo.pageId,
				set: { seo, updatedAt: now },
			});
	}

	async getGlobalContent(): Promise<GlobalContent> {
		const [row] = await this.db
			.select()
			.from(globalContent)
			.where(eq(globalContent.id, GLOBAL_ROW_ID))
			.limit(1);

		if (!row) return DEFAULT_GLOBAL_CONTENT;
		return row.content;
	}

	async saveGlobalContent(content: GlobalContent): Promise<void> {
		const now = new Date().toISOString();
		await this.db
			.insert(globalContent)
			.values({ id: GLOBAL_ROW_ID, content, updatedAt: now })
			.onConflictDoUpdate({
				target: globalContent.id,
				set: { content, updatedAt: now },
			});
	}

	async getFormsConfig(): Promise<ContactFormsConfig> {
		const [row] = await this.db
			.select()
			.from(formDefinitions)
			.where(eq(formDefinitions.id, FORMS_ROW_ID))
			.limit(1);

		if (!row) return DEFAULT_FORMS_CONFIG;
		return row.config as ContactFormsConfig;
	}

	async saveFormsConfig(config: ContactFormsConfig): Promise<void> {
		const now = new Date().toISOString();
		await this.db
			.insert(formDefinitions)
			.values({ id: FORMS_ROW_ID, config, updatedAt: now })
			.onConflictDoUpdate({
				target: formDefinitions.id,
				set: { config, updatedAt: now },
			});
	}

	async listContactSubmissions(
		options?: ListContactSubmissionsOptions,
	): Promise<ContactSubmission[]> {
		const limit = options?.limit ?? 100;
		const offset = options?.offset ?? 0;

		const rows = await this.db
			.select()
			.from(contactSubmissions)
			.orderBy(desc(contactSubmissions.createdAt))
			.limit(limit)
			.offset(offset);

		return rows.map(mapContactSubmissionRow);
	}

	async createContactSubmission(
		input: CreateContactSubmissionInput,
	): Promise<ContactSubmission> {
		const [row] = await this.db
			.insert(contactSubmissions)
			.values({
				caseNumber: input.caseNumber,
				formPreset: input.formPreset,
				formName: input.formName,
				customerName: input.customerName,
				customerEmail: input.customerEmail.toLowerCase().trim(),
				topic: input.topic,
				topicLabel: input.topicLabel,
				topicOther: input.topicOther,
				message: input.message,
			})
			.returning();

		if (!row) {
			throw new Error("Nie udało się zapisać zgłoszenia. Spróbuj ponownie.");
		}

		return mapContactSubmissionRow(row);
	}

	async getContactSubmission(
		submissionId: string,
	): Promise<ContactSubmission | undefined> {
		const [row] = await this.db
			.select()
			.from(contactSubmissions)
			.where(eq(contactSubmissions.id, submissionId))
			.limit(1);

		if (!row) return undefined;
		return mapContactSubmissionRow(row);
	}

	async listContactSubmissionsForEmail(
		email: string,
	): Promise<ContactSubmission[]> {
		const normalized = email.toLowerCase().trim();
		const rows = await this.db
			.select()
			.from(contactSubmissions)
			.where(eq(contactSubmissions.customerEmail, normalized))
			.orderBy(desc(contactSubmissions.createdAt));

		return rows.map(mapContactSubmissionRow);
	}

	async allocateContactCaseNumber(prefix: string): Promise<string> {
		const year = new Date().getFullYear();
		const safePrefix = prefix.trim() || "FK";

		return await this.db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(counters)
				.where(eq(counters.key, CASE_COUNTER_KEY))
				.limit(1)
				.for("update");

			let counter = 1;
			if (existing) {
				if (existing.year === year) {
					counter = existing.value + 1;
				}
				await tx
					.update(counters)
					.set({ year, value: counter, updatedAt: new Date().toISOString() })
					.where(eq(counters.key, CASE_COUNTER_KEY));
			} else {
				await tx.insert(counters).values({
					key: CASE_COUNTER_KEY,
					year,
					value: counter,
					updatedAt: new Date().toISOString(),
				});
			}

			return `${safePrefix}-${year}-${String(counter).padStart(5, "0")}`;
		});
	}

	async listSubmissions(
		formId: string,
		options?: ListSubmissionsOptions,
	): Promise<FormSubmission[]> {
		const limit = options?.limit ?? 50;
		const offset = options?.offset ?? 0;

		const rows = await this.db
			.select()
			.from(formSubmissions)
			.where(eq(formSubmissions.formId, formId))
			.orderBy(desc(formSubmissions.createdAt))
			.limit(limit)
			.offset(offset);

		return rows.map((row) => ({
			id: row.id,
			formId: row.formId,
			formSlug: row.formSlug,
			fields: row.fields,
			ipHash: row.ipHash ?? undefined,
			userAgent: row.userAgent ?? undefined,
			createdAt: row.createdAt,
		}));
	}

	async createSubmission(
		input: CreateFormSubmissionInput,
	): Promise<FormSubmission> {
		const [row] = await this.db
			.insert(formSubmissions)
			.values({
				formId: input.formId,
				formSlug: input.formSlug,
				fields: input.fields,
				ipHash: input.ipHash,
				userAgent: input.userAgent,
			})
			.returning();

		if (!row) {
			throw new Error("Nie udało się zapisać zgłoszenia. Spróbuj ponownie.");
		}

		return {
			id: row.id,
			formId: row.formId,
			formSlug: row.formSlug,
			fields: row.fields,
			ipHash: row.ipHash ?? undefined,
			userAgent: row.userAgent ?? undefined,
			createdAt: row.createdAt,
		};
	}

	async getSubmission(
		submissionId: string,
	): Promise<FormSubmission | undefined> {
		const [row] = await this.db
			.select()
			.from(formSubmissions)
			.where(eq(formSubmissions.id, submissionId))
			.limit(1);

		if (!row) return undefined;

		return {
			id: row.id,
			formId: row.formId,
			formSlug: row.formSlug,
			fields: row.fields,
			ipHash: row.ipHash ?? undefined,
			userAgent: row.userAgent ?? undefined,
			createdAt: row.createdAt,
		};
	}

	async listReturns(options?: ListReturnsOptions): Promise<AdminReturnRow[]> {
		const limit = options?.limit ?? 50;
		const offset = options?.offset ?? 0;

		const conditions = options?.status
			? eq(returnRequests.status, options.status)
			: undefined;

		const rows = await this.db
			.select()
			.from(returnRequests)
			.where(conditions)
			.orderBy(desc(returnRequests.createdAt))
			.limit(limit)
			.offset(offset);

		const result: AdminReturnRow[] = [];

		for (const row of rows) {
			const items = await this.db
				.select()
				.from(returnLineItems)
				.where(eq(returnLineItems.returnId, row.id));

			result.push({
				id: row.id,
				requestType: row.type as AdminReturnRow["requestType"],
				orderDisplayId: row.orderDisplayId ?? 0,
				customerEmail: row.customerEmail,
				status: row.status as ReturnStatus,
				totalToRefund: row.totalToRefund ?? 0,
				itemCount: items.length,
				createdAt: row.createdAt,
			});
		}

		return result;
	}

	async getReturn(returnId: string): Promise<ReturnRequest | undefined> {
		const [row] = await this.db
			.select()
			.from(returnRequests)
			.where(eq(returnRequests.id, returnId))
			.limit(1);

		if (!row) return undefined;

		const items = await this.db
			.select()
			.from(returnLineItems)
			.where(eq(returnLineItems.returnId, returnId));

		return mapReturnRow(row, items);
	}

	async createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
		const now = new Date().toISOString();
		const email = input.customerEmail.toLowerCase().trim();

		return await this.db.transaction(async (tx) => {
			if (input.requestType === "withdrawal") {
				const activeClaim = await this.findActiveForOrder(
					tx,
					email,
					input.orderId,
					"claim",
				);
				if (activeClaim) {
					throw new Error(
						activeClaim.claimReferenceId
							? `Na tym zamówieniu trwa reklamacja (${activeClaim.claimReferenceId}). Odstąpienie nie jest możliwe równolegle.`
							: "Na tym zamówieniu trwa reklamacja — odstąpienie nie jest możliwe równolegle.",
					);
				}
			}

			if (input.requestType === "claim") {
				const activeWithdrawal = await this.findActiveForOrder(
					tx,
					email,
					input.orderId,
					"withdrawal",
				);
				if (activeWithdrawal) {
					throw new Error(
						"Na tym zamówieniu trwa odstąpienie — reklamacja nie jest możliwa równolegle.",
					);
				}
			}

			const [row] = await tx
				.insert(returnRequests)
				.values({
					orderId: input.orderId,
					orderDisplayId: input.orderDisplayId,
					customerEmail: email,
					customerName: email,
					type: input.requestType,
					remedy: input.claimRemedy ?? null,
					claimReferenceId: input.claimReferenceId ?? null,
					status: "pending_approval",
					reason: input.reason,
					totalToRefund: input.totalToRefund,
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			if (!row) {
				throw new Error("Nie udało się utworzyć wniosku. Spróbuj ponownie.");
			}

			const items =
				input.items.length > 0
					? await tx
							.insert(returnLineItems)
							.values(
								input.items.map((item) => ({
									returnId: row.id,
									lineItemId: item.orderLineItemId,
									productTitle: item.productTitle,
									quantity: item.quantity,
									unitPrice: item.unitPrice,
									refundAmount: item.unitPrice * item.quantity,
									thumbnail: item.thumbnail,
								})),
							)
							.returning()
					: [];

			return mapReturnRow(row, items);
		});
	}

	async updateReturnStatus(
		returnId: string,
		status: ReturnStatus,
		extra?: UpdateReturnStatusExtra,
	): Promise<ReturnRequest> {
		const now = new Date().toISOString();

		const patch: Partial<typeof returnRequests.$inferInsert> = {
			status,
			updatedAt: now,
		};

		if (status === "approved") patch.approvedAt = now;
		if (status === "shipped") patch.shippedAt = now;
		if (status === "received") patch.receivedAt = now;
		if (status === "refunded") patch.refundedAt = now;
		if (status === "rejected") {
			patch.rejectedAt = now;
			if (extra?.rejectionReason) patch.rejectionReason = extra.rejectionReason;
		}
		if (extra?.adminNotes) patch.adminNote = extra.adminNotes;

		const [row] = await this.db
			.update(returnRequests)
			.set(patch)
			.where(eq(returnRequests.id, returnId))
			.returning();

		if (!row) {
			throw new Error("Nie znaleziono wniosku zwrotowego.");
		}

		const items = await this.db
			.select()
			.from(returnLineItems)
			.where(eq(returnLineItems.returnId, returnId));

		return mapReturnRow(row, items);
	}

	async getReturnsByCustomerEmail(email: string): Promise<ReturnRequest[]> {
		const rows = await this.db
			.select()
			.from(returnRequests)
			.where(eq(returnRequests.customerEmail, email.toLowerCase().trim()))
			.orderBy(desc(returnRequests.createdAt));

		const result: ReturnRequest[] = [];

		for (const row of rows) {
			const items = await this.db
				.select()
				.from(returnLineItems)
				.where(eq(returnLineItems.returnId, row.id));
			result.push(mapReturnRow(row, items));
		}

		return result;
	}

	async getActiveClaimForOrder(
		customerEmail: string,
		orderId: string,
	): Promise<ReturnRequest | undefined> {
		return this.findActiveForOrder(
			this.db,
			customerEmail.toLowerCase().trim(),
			orderId,
			"claim",
		);
	}

	async getActiveWithdrawalForOrder(
		customerEmail: string,
		orderId: string,
	): Promise<ReturnRequest | undefined> {
		return this.findActiveForOrder(
			this.db,
			customerEmail.toLowerCase().trim(),
			orderId,
			"withdrawal",
		);
	}

	async recordAudit(entry: AuditEntry): Promise<void> {
		await this.db.insert(auditLog).values({
			action: entry.action,
			actorEmail: entry.actorEmail,
			resourceType: entry.resourceType,
			resourceId: entry.resourceId,
			metadata: entry.metadata,
			createdAt: entry.createdAt,
		});
	}

	private async findActiveForOrder(
		db: PostgresClient["db"] | Parameters<Parameters<PostgresClient["db"]["transaction"]>[0]>[0],
		customerEmail: string,
		orderId: string,
		requestType: ReturnRequest["requestType"],
	): Promise<ReturnRequest | undefined> {
		const rows = await db
			.select()
			.from(returnRequests)
			.where(
				and(
					eq(returnRequests.customerEmail, customerEmail),
					eq(returnRequests.orderId, orderId),
					eq(returnRequests.type, requestType),
				),
			);

		for (const row of rows) {
			if (!isActiveReturn(row.status as ReturnStatus)) continue;
			const items = await db
				.select()
				.from(returnLineItems)
				.where(eq(returnLineItems.returnId, row.id));
			return mapReturnRow(row, items);
		}

		return undefined;
	}
}
