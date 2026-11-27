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

// What sign-in needs (features/auth). Checked apart from the database, the first time sign-in is
// used, so pages that don't use it keep working without these settings.
//   BETTER_AUTH_URL       this deploy's own address, e.g. http://localhost:5173
//   AUTH_PROXY_URL        previews only: the helper Google answers to (ADR 0022). Unset elsewhere
//   AUTH_TRUSTED_ORIGINS  the helper only: the preview addresses it may hand a sign-in to, comma-separated
const url = z.url({ protocol: /^https?$/ });
const authSettingsSchema = z.object({
	BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
	BETTER_AUTH_URL: url,
	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	AUTH_PROXY_URL: url.optional(),
	AUTH_TRUSTED_ORIGINS: z
		.string()
		.optional()
		.transform((value) =>
			(value ?? "")
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		),
});

export type AuthSettings = z.infer<typeof authSettingsSchema>;

// Checks the sign-in settings and stops with a message naming each one that is missing or wrong.
// Never echoes a value: some of them are secrets.
export function readAuthSettings(source: unknown): AuthSettings {
	const result = authSettingsSchema.safeParse(source);
	if (result.success) return result.data;
	const given = (typeof source === "object" && source) || {};
	const problems = result.error.issues.map((issue) => {
		const name = issue.path.join(".");
		return `${name}: ${name in given ? issue.message : "missing"}`;
	});
	throw new Error(
		`The sign-in settings are missing or wrong. ${problems.join("; ")}. Locally they go in apps/web/.dev.vars (see .dev.vars.example); on previews the deploy sets them (ADR 0022).`,
	);
}

let authSettings: AuthSettings | undefined;

export function getAuthSettings(): AuthSettings {
	authSettings ??= readAuthSettings(env);
	return authSettings;
}

let database: Database | undefined;

// The Drizzle client. The settings are checked the first time something asks for the database,
// not on every request, so a deploy without a database still serves the pages that don't use one.
export function getDatabase(): Database {
	database ??= createDatabase(readSettings(env).DB);
	return database;
}

export type { Database };
