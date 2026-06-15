import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type PostgresClient = ReturnType<typeof createPostgresClient>;

/** Tworzy klienta Drizzle z połączenia `DATABASE_URL`. */
export function createPostgresClient(databaseUrl: string) {
	const sql = postgres(databaseUrl, {
		max: 10,
		idle_timeout: 20,
		connect_timeout: 10,
	});
	const db = drizzle(sql, { schema });
	return { db, sql, schema };
}
