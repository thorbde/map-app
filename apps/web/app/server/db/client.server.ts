// The Drizzle client. Only server/platform/ calls this: it owns the D1 binding (ADR 0006),
// and the rest of the app receives the client it returns.
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDatabase(binding: D1Database) {
	return drizzle(binding, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
