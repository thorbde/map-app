import { describe, expect, it } from "vitest";
import { facts } from "./facts";
import { formatFacts, formatPopulation } from "./format";

describe("the fact box's values", () => {
	it("writes a population of millions with one decimal and its year", () => {
		expect(formatPopulation({ count: 16_876_720, year: 2021 })).toBe(
			"16.9 million (2021)",
		);
		expect(formatPopulation({ count: 62_027_503, year: 2022 })).toBe(
			"62.0 million (2022)",
		);
		expect(formatPopulation({ count: 1_412_600_000, year: 2021 })).toBe(
			"1.4 billion (2021)",
		);
	});

	it("writes a population under a million exactly", () => {
		expect(formatPopulation({ count: 89_752, year: 2026 })).toBe(
			"89,752 (2026)",
		);
		expect(formatPopulation({ count: 882, year: 2024 })).toBe("882 (2024)");
		// Not "1,000.0 thousand".
		expect(formatPopulation({ count: 999_999, year: 2020 })).toBe(
			"999,999 (2020)",
		);
	});

	it("lists capital, language, population and government, in that order", () => {
		expect(
			formatFacts({
				capitals: ["Dakar"],
				languages: ["French"],
				population: { count: 16_876_720, year: 2021 },
				government: "presidential system",
				neighbours: ["GM"],
			}),
		).toEqual([
			{ label: "Capital", values: ["Dakar"] },
			{ label: "Language", values: ["French"] },
			{ label: "Population", values: ["16.9 million (2021)"] },
			{ label: "Government", values: ["Presidential system"] },
		]);
	});

	it("says “Capitals” and “Languages” when there are several, and keeps every one", () => {
		const [capitals, languages] = formatFacts({
			capitals: ["Bloemfontein", "Cape Town", "Pretoria"],
			languages: ["Afrikaans", "English", "Zulu", "Xhosa"],
			population: { count: 62_027_503, year: 2022 },
			government: "parliamentary republic",
			neighbours: [],
		});
		expect(capitals).toEqual({
			label: "Capitals",
			values: ["Bloemfontein", "Cape Town", "Pretoria"],
		});
		expect(languages?.label).toBe("Languages");
		expect(languages?.values).toHaveLength(4);
	});

	it("gives every country four facts, none of them empty", () => {
		for (const [iso, countryFacts] of Object.entries(facts)) {
			const rows = formatFacts(countryFacts);
			expect(rows, iso).toHaveLength(4);
			for (const { label, values } of rows) {
				expect(values.length, `${iso} ${label}`).toBeGreaterThan(0);
				for (const value of values) {
					expect(value.trim(), `${iso} ${label}`).not.toBe("");
					// Starts with a capital letter or a digit, as a fact box value does.
					expect(value, `${iso} ${label}`).toMatch(/^[\p{Lu}\p{N}]/u);
				}
			}
		}
	});
});
