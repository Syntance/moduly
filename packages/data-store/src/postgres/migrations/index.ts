import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = dirname(fileURLToPath(import.meta.url));

function readMigration(name: string): string {
	return readFileSync(join(migrationsDir, name), "utf8");
}

/** SQL pierwszej migracji — tabele panelu Moduly. */
export const initialMigrationSql = readMigration("0001_initial.sql");

/** Migracja formularzy kontaktowych i rozszerzonych zwrotów. */
export const formsReturnsMigrationSql = readMigration("0002_forms_returns.sql");

/** Wszystkie migracje SQL w kolejności aplikacji. */
export const migrations: readonly string[] = [
	initialMigrationSql,
	formsReturnsMigrationSql,
];
