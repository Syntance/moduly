import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260401195750 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "config_option" ("id" text not null, "type" text not null, "name" text not null, "hex_color" text null, "color_category" text null, "mat_allowed" boolean not null default true, "sort_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "config_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_config_option_deleted_at" ON "config_option" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "config_option" cascade;`);
  }

}
