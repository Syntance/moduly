import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import type { ContactTopicPreset } from "@moduly/types";

/** Administrator panelu z hasłem Argon2. */
export const adminUsers = pgTable("admin_users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Aktywne sesje JWT administratora (hash tokenu do unieważniania). */
export const adminSessions = pgTable(
	"admin_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => adminUsers.id, { onDelete: "cascade" }),
		tokenHash: text("token_hash").notNull().unique(),
		expiresAt: timestamp("expires_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("admin_sessions_user_id_idx").on(table.userId)],
);

/** Dziennik audytu panelu administracyjnego. */
export const auditLog = pgTable(
	"audit_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		action: text("action").notNull(),
		actorEmail: text("actor_email").notNull(),
		resourceType: text("resource_type").notNull(),
		resourceId: text("resource_id").notNull(),
		metadata: jsonb("metadata").$type<
			Record<string, string | number | boolean>
		>(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("audit_log_created_at_idx").on(table.createdAt),
		index("audit_log_resource_idx").on(table.resourceType, table.resourceId),
	],
);

/** Ustawienia witryny z wersją do optimistic locking. */
export const siteSettings = pgTable("site_settings", {
	id: text("id").primaryKey().default("default"),
	data: jsonb("data").notNull().$type<Record<string, unknown>>(),
	version: integer("version").notNull().default(1),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Treść CMS per podstrona. */
export const pageContent = pgTable("page_content", {
	pageId: text("page_id").primaryKey(),
	content: jsonb("content").notNull().$type<Record<string, unknown>>(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Metadane SEO per podstrona. */
export const pageSeo = pgTable("page_seo", {
	pageId: text("page_id").primaryKey(),
	seo: jsonb("seo").notNull().$type<Record<string, unknown>>(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Bloki globalne współdzielone między podstronami. */
export const globalContent = pgTable("global_content", {
	id: text("id").primaryKey().default("default"),
	content: jsonb("content").notNull().$type<Record<string, unknown>>(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Definicje formularzy kontaktowych (ContactFormsConfig). */
export const formDefinitions = pgTable("form_definitions", {
	id: text("id").primaryKey().default("default"),
	config: jsonb("config").notNull().$type<Record<string, unknown>>(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Zgłoszenia formularzy kontaktowych (retrohouse). */
export const contactSubmissions = pgTable(
	"contact_submissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		caseNumber: text("case_number").notNull(),
		formPreset: text("form_preset").notNull().$type<ContactTopicPreset>(),
		formName: text("form_name").notNull(),
		customerName: text("customer_name").notNull(),
		customerEmail: text("customer_email").notNull(),
		topic: text("topic").notNull(),
		topicLabel: text("topic_label").notNull(),
		topicOther: text("topic_other"),
		message: text("message").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("contact_submissions_created_at_idx").on(table.createdAt),
		index("contact_submissions_customer_email_idx").on(table.customerEmail),
	],
);

/** Liczniki sekwencyjne (numery spraw FK-…). */
export const counters = pgTable("counters", {
	key: text("key").primaryKey(),
	year: integer("year").notNull(),
	value: integer("value").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.notNull()
		.defaultNow(),
});

/** Zgłoszenia z formularzy kontaktowych — legacy/generic. */
export const formSubmissions = pgTable(
	"form_submissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		formId: text("form_id").notNull(),
		formSlug: text("form_slug").notNull(),
		fields: jsonb("fields").notNull().$type<
			Record<string, string | boolean>
		>(),
		ipHash: text("ip_hash"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("form_submissions_form_id_idx").on(table.formId),
		index("form_submissions_created_at_idx").on(table.createdAt),
	],
);

/** Wnioski zwrotowe / reklamacyjne. */
export const returnRequests = pgTable(
	"return_requests",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		orderId: text("order_id").notNull(),
		orderDisplayId: integer("order_display_id"),
		customerEmail: text("customer_email").notNull(),
		customerName: text("customer_name").notNull(),
		type: text("type").notNull(),
		remedy: text("remedy"),
		status: text("status").notNull().default("pending_approval"),
		reason: text("reason").notNull(),
		description: text("description"),
		adminNote: text("admin_note"),
		claimReferenceId: text("claim_reference_id"),
		totalToRefund: integer("total_to_refund"),
		approvedAt: timestamp("approved_at", { withTimezone: true, mode: "string" }),
		shippedAt: timestamp("shipped_at", { withTimezone: true, mode: "string" }),
		receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }),
		refundedAt: timestamp("refunded_at", { withTimezone: true, mode: "string" }),
		rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "string" }),
		rejectionReason: text("rejection_reason"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("return_requests_status_idx").on(table.status),
		index("return_requests_customer_email_idx").on(table.customerEmail),
		index("return_requests_created_at_idx").on(table.createdAt),
		index("return_requests_order_id_idx").on(table.orderId),
	],
);

/** Pozycje wniosku zwrotowego — kwoty w groszach. */
export const returnLineItems = pgTable(
	"return_line_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		returnId: uuid("return_id")
			.notNull()
			.references(() => returnRequests.id, { onDelete: "cascade" }),
		lineItemId: text("line_item_id").notNull(),
		productTitle: text("product_title").notNull(),
		quantity: integer("quantity").notNull(),
		refundAmount: integer("refund_amount"),
		unitPrice: integer("unit_price"),
		thumbnail: text("thumbnail"),
	},
	(table) => [index("return_line_items_return_id_idx").on(table.returnId)],
);
