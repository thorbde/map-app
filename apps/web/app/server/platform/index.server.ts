// The front door of server/platform/: the only file the rest of the app may import from here.
// It hands out what the Workers runtime provides, checked, so nothing else touches Workers APIs.
import { env } from "cloudflare:workers";
import { z } from "zod";
import { createDatabase, type Database } from "../db/client.server";

// What the app needs from its environment. Today only the database binding.
const settingsSchema = z.object({
	DB: z.custom<D1Database>(
		(value) =>
			typeof value === "object" &&
			value !== null &&
			typeof (value as D1Database).prepare === "function" &&
			typeof (value as D1Database).batch === "function",
		{ message: "must be a D1 database binding" },
	),
});

type Settings = z.infer<typeof settingsSchema>;

// Checks the settings and stops with a message naming each one that is missing or wrong.
export function readSettings(source: unknown): Settings {
	const result = settingsSchema.safeParse(source);
	if (result.success) return result.data;
	const given = (typeof source === "object" && source) || {};
	const problems = result.error.issues.map((issue) => {
		const name = issue.path.join(".");
		if (!name) return "there are no settings at all";
		return `${name}: ${name in given ? issue.message : "missing"}`;
	});
	throw new Error(
		`The app's settings are missing or wrong. ${problems.join("; ")}. The database binding is DB in wrangler.jsonc (ARCHITECTURE.md, "Environments").`,
	);
}

let database: Database | undefined;

// The Drizzle client. The settings are checked the first time something asks for the database,
// not on every request, so a deploy without a database still serves the pages that don't use one.
export function getDatabase(): Database {
	database ??= createDatabase(readSettings(env).DB);
	return database;
}

export type { Database };
