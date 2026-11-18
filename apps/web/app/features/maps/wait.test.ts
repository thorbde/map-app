import { describe, expect, it } from "vitest";
import { orAfter } from "./wait";

describe("waiting, but not for ever", () => {
	it("gives the value when it comes in time", async () => {
		expect(await orAfter(Promise.resolve("drawn"), 1_000)).toBe("drawn");
	});

	it("gives up on something that never comes", async () => {
		// The map's first drawing, if the map never comes to rest: the page must
		// not stay on "Loading the map" for ever (the review of thorbde/map-app#26).
		const never = new Promise<string>(() => {});
		const started = Date.now();
		expect(await orAfter(never, 30)).toBeUndefined();
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	it("still fails when what it waits for fails", async () => {
		await expect(
			orAfter(Promise.reject(new Error("no")), 1_000),
		).rejects.toThrow("no");
	});
});
