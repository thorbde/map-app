import { describe, expect, it } from "vitest";
import { user } from "../db/schema";
import { getDatabase, readSettings } from "./index.server";

describe("getDatabase", () => {
	it("hands out a Drizzle client for the configured database", async () => {
		const db = getDatabase();
		expect(getDatabase()).toBe(db);
		await db.insert(user).values({
			id: "isolation-platform",
			name: "Written by index.server.test.ts",
			email: "isolation-platform@example.com",
		});
		// Paired with database.test.ts: that file's row must not be in this file's database.
		const rows = await db.select({ id: user.id }).from(user);
		expect(rows.map((row) => row.id)).toEqual(["isolation-platform"]);
	});
});

describe("readSettings", () => {
	it("stops with a message naming the missing database", () => {
		expect(() => readSettings({})).toThrow(/DB: missing/);
	});

	it("stops with a message naming a database binding that is wrong", () => {
		expect(() => readSettings({ DB: "memogra-local" })).toThrow(
			/DB: must be a D1 database binding/,
		);
	});

	it("stops when there are no settings at all", () => {
		expect(() => readSettings(undefined)).toThrow(/settings are missing/);
	});
});
