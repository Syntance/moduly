import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260615000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "return_request" ("id" text not null, "request_type" text not null, "order_id" text not null, "order_display_id" integer not null, "customer_email" text not null, "status" text not null default 'pending_approval', "reason" text not null, "claim_remedy" text null, "claim_reference_id" text null, "items" jsonb not null, "total_to_refund" integer not null, "approved_at" timestamptz null, "shipped_at" timestamptz null, "received_at" timestamptz null, "refunded_at" timestamptz null, "rejected_at" timestamptz null, "rejection_reason" text null, "admin_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_request_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_request_order_id" ON "return_request" ("order_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_request_customer_email" ON "return_request" ("customer_email") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_request_status" ON "return_request" ("status") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_request_deleted_at" ON "return_request" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_request" cascade;`);
  }
}
