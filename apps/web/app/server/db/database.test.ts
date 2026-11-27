import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDatabase } from "./client.server";
import { session, user } from "./schema";

const db = createDatabase(env.DB as D1Database);

describe("the test database", () => {
	it("has the migrations applied, with every Better Auth table", async () => {
		const tables = await (env.DB as D1Database)
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
			)
			.all<{ name: string }>();
		expect(tables.results.map((table) => table.name)).toEqual(
			expect.arrayContaining(["account", "session", "user", "verification"]),
		);
	});

	// Paired with the same test in server/platform/index.server.test.ts: each file writes a row
	// and must not see the other file's, whichever runs first.
	it("is this file's own: a row another test file writes is not here", async () => {
		await db.insert(user).values({
			id: "isolation-db",
			name: "Written by database.test.ts",
			email: "isolation-db@example.com",
		});
		const rows = await db.select({ id: user.id }).from(user);
		expect(rows.map((row) => row.id)).not.toContain("isolation-platform");
	});
});

describe("db.batch()", () => {
	it("writes nothing when one statement fails halfway", async () => {
		await expect(
			db.batch([
				db.insert(user).values({
					id: "batch-user",
					name: "Batch",
					email: "batch@example.com",
				}),
				db.insert(session).values({
					id: "batch-session",
					userId: "batch-user",
					token: "t1",
					expiresAt: new Date(Date.now() + 60_000),
				}),
				// Fails: the session id is already taken by the statement above.
				db.insert(session).values({
					id: "batch-session",
					userId: "batch-user",
					token: "t2",
					expiresAt: new Date(Date.now() + 60_000),
				}),
			]),
		).rejects.toThrow();

		expect(
			await db.select().from(user).where(eq(user.id, "batch-user")),
		).toEqual([]);
		expect(await db.select().from(session)).toEqual([]);
	});

	it("writes every statement when none fails", async () => {
		await db.batch([
			db.insert(user).values({
				id: "batch-ok",
				name: "Batch",
				email: "batch-ok@example.com",
			}),
			db.insert(session).values({
				id: "batch-ok-session",
				userId: "batch-ok",
				token: "t3",
				expiresAt: new Date(Date.now() + 60_000),
			}),
		]);
		const rows = await db.query.user.findFirst({
			where: eq(user.id, "batch-ok"),
			with: { sessions: true },
		});
		expect(rows?.sessions.map((s) => s.id)).toEqual(["batch-ok-session"]);
		// Times come back as dates, stored as whole milliseconds (ADR 0006).
		expect(rows?.createdAt).toBeInstanceOf(Date);
	});
});
