import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260615000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "form_submission" ("id" text not null, "form_id" text not null, "form_slug" text not null, "fields" jsonb not null, "ip_hash" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "form_submission_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_form_submission_form_id" ON "form_submission" ("form_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_form_submission_created_at" ON "form_submission" ("created_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_form_submission_deleted_at" ON "form_submission" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "form_submission" cascade;`);
  }
}
