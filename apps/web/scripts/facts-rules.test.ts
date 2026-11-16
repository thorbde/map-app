import { describe, expect, it } from "vitest";
import { factOverrides } from "../app/features/countries/facts-overrides.ts";
import type { CountryFacts } from "../app/features/countries/facts-types.ts";
import { countries, facts } from "../app/features/countries/index.ts";
import {
	buildFacts,
	factFields,
	parseStatements,
	pickCapitals,
	pickGovernment,
	pickLanguages,
	pickNeighbours,
	pickPopulation,
	problemWith,
	renderFactsFile,
	renderReport,
	type Statement,
} from "./facts-rules.ts";
// Real answers from Wikidata (November 2026), cut down to a few countries.
import sample from "./fixtures/wikidata-sample.json";
import { wikidataIds } from "./wikidata-ids.ts";

const isos = countries.map((country) => country.iso);
const isoSet = new Set(isos);

function statementsFor(fact: keyof typeof sample, iso: string): Statement[] {
	return parseStatements(sample[fact]).filter(
		(statement) => statement.item === wikidataIds[iso],
	);
}

function statement(partial: Partial<Statement>): Statement {
	return {
		item: "Q1",
		value: "Q2",
		label: "Somewhere",
		rank: "normal",
		ended: false,
		time: undefined,
		maritime: false,
		...partial,
	};
}

describe("the committed facts", () => {
	it("has a complete entry for every country, and for nothing else", () => {
		expect(Object.keys(facts).sort()).toEqual([...isos].sort());
		for (const iso of isos) {
			const entry = facts[iso] as CountryFacts;
			expect(Object.keys(entry).sort()).toEqual([...factFields].sort());
			for (const field of factFields) {
				expect(
					problemWith(field, entry[field], isoSet, iso),
					`${iso}.${field}`,
				).toBeUndefined();
			}
		}
	});

	it("has every border from both sides", () => {
		for (const iso of isos) {
			for (const other of facts[iso]?.neighbours ?? []) {
				expect(facts[other]?.neighbours, `${other} → ${iso}`).toContain(iso);
			}
		}
	});

	it("is in step with the overrides file", () => {
		for (const [iso, override] of Object.entries(factOverrides)) {
			for (const field of factFields) {
				const pinned = override[field];
				if (pinned) {
					expect(facts[iso]?.[field], `${iso}.${field}`).toEqual(pinned.value);
				}
			}
		}
	});

	it("has a Wikidata item for every country", () => {
		for (const iso of isos) expect(wikidataIds[iso], iso).toMatch(/^Q\d+$/);
	});
});

describe("reading Wikidata's answer", () => {
	it("rejects an answer that isn't the expected shape", () => {
		expect(() => parseStatements({ error: "timeout" })).toThrow();
		expect(() =>
			parseStatements({ results: { bindings: [{ item: { value: "Q1" } }] } }),
		).toThrow();
	});
});

describe("capitals", () => {
	it("keeps every current capital, sorted", () => {
		expect(pickCapitals(statementsFor("capital", "ZA"))).toEqual([
			"Bloemfontein",
			"Cape Town",
			"Pretoria",
		]);
		expect(pickCapitals(statementsFor("capital", "BO"))).toEqual([
			"La Paz",
			"Sucre",
		]);
	});

	it("drops former capitals", () => {
		// Sweden's statements include historical ones with an end date.
		expect(pickCapitals(statementsFor("capital", "SE"))).toEqual(["Stockholm"]);
		expect(
			pickCapitals([
				statement({ label: "Old Town", ended: true }),
				statement({ label: "New Town" }),
			]),
		).toEqual(["New Town"]);
	});

	it("prefers the preferred rank, and ignores deprecated values", () => {
		expect(
			pickCapitals([
				statement({ label: "A" }),
				statement({ label: "B", rank: "preferred" }),
				statement({ label: "C", rank: "deprecated" }),
			]),
		).toEqual(["B"]);
	});

	it("has no answer when a value has no English label", () => {
		expect(pickCapitals([statement({ label: "Q12345" })])).toBeUndefined();
	});
});

describe("languages", () => {
	it("keeps every official language, sorted", () => {
		expect(pickLanguages(statementsFor("language", "FI"))).toEqual([
			"Finnish",
			"Swedish",
		]);
		expect(pickLanguages(statementsFor("language", "BO"))).toEqual([
			"Aymara",
			"Guarani",
			"Quechua",
			"Spanish",
		]);
	});
});

describe("population", () => {
	it("takes Wikidata's preferred figure, not simply the newest", () => {
		// Tunisia has a mistaken 37 million for 2026 at normal rank.
		expect(pickPopulation(statementsFor("population", "TN"))).toEqual({
			count: 11565204,
			year: 2018,
		});
	});

	it("takes the newest of several current figures", () => {
		expect(
			pickPopulation([
				statement({ value: "100", time: "2020-01-01T00:00:00Z" }),
				statement({ value: "120", time: "2024-01-01T00:00:00Z" }),
				statement({ value: "999" }),
			]),
		).toEqual({ count: 120, year: 2024 });
	});

	it("has no answer without a dated whole number", () => {
		expect(pickPopulation([statement({ value: "100" })])).toBeUndefined();
		expect(
			pickPopulation([
				statement({ value: "lots", time: "2024-01-01T00:00:00Z" }),
			]),
		).toBeUndefined();
	});
});

describe("government", () => {
	it("picks one form from several", () => {
		expect(pickGovernment(statementsFor("government", "KP"))).toBe(
			"one-party state",
		);
		expect(pickGovernment(statementsFor("government", "SE"))).toBe(
			"constitutional monarchy",
		);
	});

	it("has no answer when Wikidata only has forms we don't show", () => {
		expect(pickGovernment(statementsFor("government", "RU"))).toBeUndefined();
	});

	it("has no answer when a value is new to us", () => {
		expect(
			pickGovernment([
				statement({ label: "republic" }),
				statement({ label: "best country ever" }),
			]),
		).toBeUndefined();
	});
});

describe("neighbours", () => {
	const isoByItem = new Map(isos.map((iso) => [wikidataIds[iso] ?? "", iso]));
	const neighbours = pickNeighbours(parseStatements(sample.border), isoByItem);

	it("keeps borders stated from both sides", () => {
		expect(neighbours.get("NO")).toEqual(["FI", "RU", "SE"]);
	});

	it("drops borders stated from one side only", () => {
		// Russia lists Sweden, and Denmark lists Norway: sea borders, one side only.
		expect(neighbours.get("RU")).not.toContain("SE");
		expect(neighbours.get("DK")).not.toContain("NO");
	});

	it("drops borders marked as sea borders", () => {
		const marked = pickNeighbours(
			[
				statement({ item: "Q34", value: "Q35", maritime: true }),
				statement({ item: "Q35", value: "Q34" }),
			],
			isoByItem,
		);
		expect(marked.get("SE")).toEqual([]);
		expect(marked.get("DK")).toEqual([]);
	});
});

describe("building the dataset", () => {
	const two = ["SE", "NO"];
	const sweden: CountryFacts = {
		capitals: ["Stockholm"],
		languages: ["Swedish"],
		population: { count: 10_500_000, year: 2024 },
		government: "constitutional monarchy",
		neighbours: ["NO"],
	};
	const norway: CountryFacts = {
		capitals: ["Oslo"],
		languages: ["Norwegian"],
		population: { count: 5_500_000, year: 2024 },
		government: "constitutional monarchy",
		neighbours: ["SE"],
	};
	const previous = { SE: sweden, NO: norway };
	const fetched = (se: Partial<CountryFacts>) =>
		new Map<string, Partial<CountryFacts>>([
			["SE", se],
			["NO", norway],
		]);

	it("takes Wikidata's values and reports what changed", () => {
		const result = buildFacts({
			isos: two,
			fetched: fetched({
				...sweden,
				population: { count: 10_600_000, year: 2025 },
			}),
			previous,
			overrides: {},
		});
		expect(result.facts.SE?.population).toEqual({
			count: 10_600_000,
			year: 2025,
		});
		expect(result.changes).toEqual([
			{
				iso: "SE",
				field: "population",
				before: "10500000 (2024)",
				after: "10600000 (2025)",
			},
		]);
		expect(result.kept).toEqual([]);
	});

	it("lets an override win over Wikidata", () => {
		const result = buildFacts({
			isos: two,
			fetched: fetched({ ...sweden, capitals: ["Gothenburg"] }),
			previous,
			overrides: {
				SE: { capitals: { value: ["Stockholm"], reason: "A test." } },
			},
		});
		expect(result.facts.SE?.capitals).toEqual(["Stockholm"]);
		expect(result.changes).toEqual([]);
	});

	it("keeps the old value when Wikidata's is missing or malformed", () => {
		for (const broken of [
			{ ...sweden, capitals: undefined },
			{ ...sweden, capitals: [] },
			{ ...sweden, capitals: ["  "] },
			{ ...sweden, population: { count: -5, year: 2025 } },
			{ ...sweden, neighbours: ["ZZ"] },
		]) {
			const result = buildFacts({
				isos: two,
				fetched: fetched(broken),
				previous,
				overrides: {},
			});
			expect(result.facts.SE).toEqual(sweden);
			expect(result.kept).toHaveLength(1);
			expect(result.changes).toEqual([]);
		}
	});

	it("keeps the old value when the new one is wildly different", () => {
		for (const wild of [
			{ ...sweden, population: { count: 1_000_000, year: 2025 } },
			{ ...sweden, population: { count: 20_000_000, year: 2025 } },
			{ ...sweden, population: { count: 10_500_001, year: 2019 } },
		]) {
			const result = buildFacts({
				isos: two,
				fetched: fetched(wild),
				previous,
				overrides: {},
			});
			expect(result.facts.SE).toEqual(sweden);
			expect(result.kept.map((kept) => kept.field)).toEqual(["population"]);
		}
	});

	it("keeps a country's neighbours when several disappear at once", () => {
		const result = buildFacts({
			isos: ["SE", "NO", "FI"],
			fetched: new Map([
				["SE", { ...sweden, neighbours: [] }],
				["NO", { ...norway, neighbours: ["FI"] }],
				["FI", { ...norway, neighbours: ["NO"] }],
			]),
			previous: {
				SE: { ...sweden, neighbours: ["FI", "NO"] },
				NO: { ...norway, neighbours: ["FI", "SE"] },
				FI: { ...norway, neighbours: ["NO", "SE"] },
			},
			overrides: {},
		});
		expect(result.facts.SE?.neighbours).toEqual(["FI", "NO"]);
		expect(result.facts.NO?.neighbours).toEqual(["FI", "SE"]);
		expect(result.facts.FI?.neighbours).toEqual(["NO", "SE"]);
		expect(result.kept).toContainEqual(
			expect.objectContaining({ iso: "SE", field: "neighbours" }),
		);
	});

	it("refuses to build when a fact has no value at all", () => {
		expect(() =>
			buildFacts({
				isos: two,
				fetched: fetched({ ...sweden, government: undefined }),
				previous: { NO: norway },
				overrides: {},
			}),
		).toThrow(/SE\.government/);
	});

	it("refuses an override that is invalid, has no reason, or names no country", () => {
		const build = (overrides: Parameters<typeof buildFacts>[0]["overrides"]) =>
			buildFacts({ isos: two, fetched: fetched(sweden), previous, overrides });
		expect(() =>
			build({ SE: { capitals: { value: [], reason: "A test." } } }),
		).toThrow(/SE\.capitals/);
		expect(() =>
			build({ SE: { capitals: { value: ["Stockholm"], reason: " " } } }),
		).toThrow(/no reason/);
		expect(() =>
			build({ ZZ: { capitals: { value: ["Nowhere"], reason: "A test." } } }),
		).toThrow(/unknown country/);
	});

	it("lets an override on one side settle a border for both", () => {
		const result = buildFacts({
			isos: two,
			fetched: fetched(sweden),
			previous,
			overrides: { NO: { neighbours: { value: [], reason: "A test." } } },
		});
		expect(result.facts.NO?.neighbours).toEqual([]);
		expect(result.facts.SE?.neighbours).toEqual([]);
	});

	it("refuses two overrides that disagree on a border", () => {
		expect(() =>
			buildFacts({
				isos: two,
				fetched: fetched(sweden),
				previous,
				overrides: {
					NO: { neighbours: { value: [], reason: "A test." } },
					SE: { neighbours: { value: ["NO"], reason: "A test." } },
				},
			}),
		).toThrow(/disagree/);
	});

	it("writes the same file for the same facts, and reports in plain words", () => {
		const file = renderFactsFile({ SE: sweden, NO: norway });
		expect(file).toBe(renderFactsFile({ NO: norway, SE: sweden }));
		expect(file).toContain('\t\tcapitals: ["Oslo"],');
		expect(renderFactsFile(facts)).toContain("\tSE: {");
		const report = renderReport(
			[{ iso: "SE", field: "capitals", before: "Stockholm", after: "Malmö" }],
			[{ iso: "NO", field: "government", why: "Wikidata has no usable value" }],
			{ SE: "Sweden", NO: "Norway" },
		);
		expect(report).toContain("- **Sweden**, capitals: Stockholm → Malmö");
		expect(report).toContain(
			"- **Norway**, government: Wikidata has no usable value",
		);
	});
});
