import { describe, expect, it } from "vitest";
import { type Continent, countries, type RegionId, regions } from "./index";

function isosIn(region: RegionId): string[] {
	return countries
		.filter((country) => country.region === region)
		.map((country) => country.iso)
		.sort();
}

function sorted(isos: string): string[] {
	return isos.split(" ").sort();
}

describe("countries", () => {
	it("has 200 countries", () => {
		expect(countries).toHaveLength(200);
	});

	it("has the right number of countries in each continent", () => {
		const counts: Record<Continent, number> = {
			africa: 0,
			europe: 0,
			asia: 0,
			"north-america": 0,
			"south-america": 0,
			oceania: 0,
		};
		for (const country of countries) {
			counts[country.continent] += 1;
		}

		expect(counts).toEqual({
			africa: 55,
			europe: 45,
			asia: 49,
			"north-america": 23,
			"south-america": 12,
			oceania: 16,
		});
	});

	it("has no duplicate ISO codes or names", () => {
		const isos = countries.map((country) => country.iso);
		const names = countries.map((country) => country.name);

		expect(new Set(isos).size).toBe(isos.length);
		expect(new Set(names).size).toBe(names.length);
	});

	it("gives every country a two-letter uppercase ISO code and a name", () => {
		for (const country of countries) {
			expect(country.iso).toMatch(/^[A-Z]{2}$/);
			expect(country.name.trim()).toBe(country.name);
			expect(country.name).not.toBe("");
		}
	});

	it("has no region without countries", () => {
		for (const region of Object.keys(regions) as RegionId[]) {
			expect(isosIn(region), region).not.toHaveLength(0);
		}
	});

	// The African Union's regions, exactly as docs/specs/mvp.md §1 lists them.
	it("uses the African Union's regions for Africa", () => {
		expect(isosIn("north-africa")).toEqual(sorted("DZ EG EH LY MR MA TN"));
		expect(isosIn("west-africa")).toEqual(
			sorted("BJ BF CV CI GM GH GN GW LR ML NE NG SN SL TG"),
		);
		expect(isosIn("central-africa")).toEqual(
			sorted("BI CM CF TD CG CD GQ GA ST"),
		);
		expect(isosIn("east-africa")).toEqual(
			sorted("KM DJ ER ET KE MG MU RW SC SO SS SD TZ UG"),
		);
		expect(isosIn("southern-africa")).toEqual(
			sorted("AO BW SZ LS MW MZ NA ZA ZM ZW"),
		);
	});

	// Both are disputed and included on purpose (ADR 0019).
	it("includes Kosovo and Taiwan", () => {
		expect(isosIn("southern-europe")).toContain("XK");
		expect(isosIn("eastern-asia")).toContain("TW");
	});
});
