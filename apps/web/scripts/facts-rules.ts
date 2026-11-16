// The rules that turn Wikidata's statements into country facts (ADR 0012).
// Pure functions: no network and no files, so the tests cover them directly.
// `build-facts.ts` does the fetching and writing.

import type {
	CountryFacts,
	FactOverride,
} from "../app/features/countries/facts-types.ts";

/** One statement from Wikidata: a value with its rank and qualifiers. */
export type Statement = {
	/** The item the statement is about, e.g. "Q34". */
	item: string;
	/** The value: an item id for most facts, a number for population. */
	value: string;
	label: string | undefined;
	rank: "preferred" | "normal" | "deprecated";
	/** "End time" qualifier: the statement is historical. */
	ended: boolean;
	/** "Point in time" qualifier, as an ISO date. */
	time: string | undefined;
	/** The border is at sea ("nature of statement" or "object has role"). */
	maritime: boolean;
};

export type FactField = keyof CountryFacts;
export const factFields: readonly FactField[] = [
	"capitals",
	"languages",
	"population",
	"government",
	"neighbours",
];

const MARITIME_BOUNDARY = "Q3089219";

function idFromUri(uri: string): string {
	return uri.slice(uri.lastIndexOf("/") + 1);
}

/**
 * Reads a SPARQL JSON response. Throws on anything that isn't the expected shape:
 * Wikidata answers a query that timed out with status 200 and a cut-off body.
 */
export function parseStatements(response: unknown): Statement[] {
	const bindings = (response as { results?: { bindings?: unknown } })?.results
		?.bindings;
	if (!Array.isArray(bindings)) {
		throw new Error("Wikidata's response has no results.bindings array");
	}
	return bindings.map((binding: Record<string, { value?: unknown }>) => {
		const text = (name: string): string | undefined => {
			const value = binding[name]?.value;
			return typeof value === "string" ? value : undefined;
		};
		const item = text("item");
		const value = text("value");
		const rank = text("rank");
		if (!item || !value || !rank) {
			throw new Error("A Wikidata row is missing its item, value or rank");
		}
		return {
			item: idFromUri(item),
			value: idFromUri(value),
			label: text("valueLabel"),
			rank: rank.endsWith("PreferredRank")
				? "preferred"
				: rank.endsWith("DeprecatedRank")
					? "deprecated"
					: "normal",
			ended: text("end") !== undefined,
			time: text("time"),
			maritime: [text("role"), text("nature")].some(
				(uri) => uri !== undefined && idFromUri(uri) === MARITIME_BOUNDARY,
			),
		};
	});
}

/**
 * The statements that count today: not ended and not deprecated. If any of them
 * has preferred rank, only those (that is what the rank means on Wikidata).
 */
function current(statements: readonly Statement[]): Statement[] {
	const live = statements.filter(
		(statement) => !statement.ended && statement.rank !== "deprecated",
	);
	const preferred = live.filter((statement) => statement.rank === "preferred");
	return preferred.length > 0 ? preferred : live;
}

/** Wikidata's label service answers with the bare id when an item has no English label. */
function labels(statements: readonly Statement[]): string[] | undefined {
	const result: string[] = [];
	for (const { label } of statements) {
		if (!label || /^Q\d+$/.test(label)) return undefined;
		if (!result.includes(label)) result.push(label);
	}
	return result;
}

const byName = (a: string, b: string) => a.localeCompare(b, "en");

/** Every current capital, sorted by name. An override pins another order. */
export function pickCapitals(
	statements: readonly Statement[],
): string[] | undefined {
	return labels(current(statements))?.sort(byName);
}

/** Every current official language, sorted by name. */
export function pickLanguages(
	statements: readonly Statement[],
): string[] | undefined {
	return labels(current(statements))?.sort(byName);
}

/**
 * The newest dated figure among the current statements. Not simply the newest
 * of all: Wikidata also holds rough and mistaken figures at normal rank.
 */
export function pickPopulation(
	statements: readonly Statement[],
): CountryFacts["population"] | undefined {
	const dated = current(statements)
		.filter((statement) => statement.time && /^\d{4}-/.test(statement.time))
		.sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
	const newest = dated[0];
	if (!newest?.time) return undefined;
	const count = Number(newest.value);
	if (!Number.isInteger(count)) return undefined;
	return { count, year: Number(newest.time.slice(0, 4)) };
}

/**
 * Wikidata's "basic form of government" often has several values per country,
 * from the specific to the very general. We show one: the first of this list
 * that the country has.
 */
const governmentForms: readonly string[] = [
	"military junta",
	"provisional government",
	"one-party state",
	"papacy",
	"Islamic Republic",
	"Emirate",
	"islamic theocracy",
	"theocracy",
	"absolute monarchy",
	"parliamentary coprincipality",
	"diarchy",
	"directorial system",
	"federal parliamentary republic",
	"parliamentary monarchy",
	"constitutional monarchy",
	"federal monarchy",
	"elective monarchy",
	"semi-presidential system",
	"presidential system",
	"parliamentary republic",
	"parliamentary system",
	"parliamentary democracy",
	"federal republic",
	"people's republic",
	"constitutional republic",
	"democratic republic",
	"republic",
	"monarchy",
];

/** Known values that say too little, or are a judgement, to show on their own. */
const governmentFormsNotShown: readonly string[] = [
	"unitary state",
	"representative democracy",
	"participatory democracy",
	"democracy",
	"federation",
	"socialist state",
	"communist dictatorship",
	"family dictatorship",
	"Juche",
	"Islamic state",
	"Westminster system",
	"hereditary monarchy",
	"super-presidential republic",
];

/**
 * One form of government. Undefined when there is none we show, or when Wikidata
 * has a value this script hasn't seen before (it could be vandalism, so a person
 * adds it to one of the two lists first).
 */
export function pickGovernment(
	statements: readonly Statement[],
): string | undefined {
	const found = labels(current(statements));
	if (!found) return undefined;
	const known = found.every(
		(label) =>
			governmentForms.includes(label) ||
			governmentFormsNotShown.includes(label),
	);
	if (!known) return undefined;
	return governmentForms.find((form) => found.includes(form));
}

/**
 * Land neighbours for every country at once. A border counts when it is current,
 * not marked as a sea border, between two countries in scope, and stated from
 * both sides. Wikidata lists many sea borders without marking them; most of
 * those are stated from one side only.
 */
export function pickNeighbours(
	statements: readonly Statement[],
	isoByItem: ReadonlyMap<string, string>,
): Map<string, string[]> {
	const claimed = new Map<string, Set<string>>();
	for (const iso of isoByItem.values()) claimed.set(iso, new Set());
	for (const [item, iso] of isoByItem) {
		const own = statements.filter((statement) => statement.item === item);
		for (const statement of current(own)) {
			const other = isoByItem.get(statement.value);
			if (other && other !== iso && !statement.maritime) {
				claimed.get(iso)?.add(other);
			}
		}
	}
	const result = new Map<string, string[]>();
	for (const [iso, others] of claimed) {
		result.set(
			iso,
			[...others].filter((other) => claimed.get(other)?.has(iso)).sort(),
		);
	}
	return result;
}

/** What is wrong with one fact's value. Undefined when it is fine. */
export function problemWith(
	field: FactField,
	value: unknown,
	isos: ReadonlySet<string>,
	ownIso: string,
): string | undefined {
	const isText = (item: unknown) =>
		typeof item === "string" && item.trim() !== "" && item === item.trim();
	const isTextList = (list: unknown): list is string[] =>
		Array.isArray(list) &&
		list.every(isText) &&
		new Set(list).size === list.length;
	switch (field) {
		case "capitals":
		case "languages":
			if (!isTextList(value) || value.length === 0) {
				return "must be a list of at least one name, without repeats";
			}
			return undefined;
		case "government":
			return isText(value) ? undefined : "must be a name";
		case "population": {
			const { count, year } = (value ?? {}) as Partial<
				CountryFacts["population"]
			>;
			if (!Number.isInteger(count) || (count as number) <= 0) {
				return "the count must be a whole number above zero";
			}
			if (!Number.isInteger(year) || (year as number) < 1990) {
				return "the year must be 1990 or later";
			}
			return undefined;
		}
		case "neighbours":
			if (!isTextList(value)) return "must be a list of ISO codes";
			if (value.some((iso) => !isos.has(iso) || iso === ownIso)) {
				return "has a code that isn't another country in the list";
			}
			return undefined;
	}
}

/**
 * Whether a new value is too different from the one we have to take without a
 * person looking: more likely a mistake or vandalism than a real change.
 */
function suspiciousChange(
	field: FactField,
	previous: CountryFacts,
	next: CountryFacts,
): string | undefined {
	if (field === "population") {
		const ratio = next.population.count / previous.population.count;
		if (ratio > 1.25 || ratio < 0.8) {
			return "the population changed by more than a quarter";
		}
		if (next.population.year < previous.population.year) {
			return "the new figure is older than the one we have";
		}
	}
	if (field === "neighbours") {
		const lost = previous.neighbours.filter(
			(iso) => !next.neighbours.includes(iso),
		);
		if (lost.length > 1) return "more than one neighbour disappeared";
	}
	return undefined;
}

export type Change = {
	iso: string;
	field: FactField;
	before: string;
	after: string;
};
export type Kept = { iso: string; field: FactField; why: string };

function show(value: CountryFacts[FactField] | undefined): string {
	if (value === undefined) return "nothing";
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.join(", ") || "none";
	return `${value.count} (${value.year})`;
}

/**
 * Builds the complete dataset. For each country and fact, in this order:
 * 1. the override, if there is one;
 * 2. Wikidata's value, if it is valid and not suspiciously different;
 * 3. the value we already have, reported as kept.
 * Borders are then settled as pairs, so both sides always agree.
 * Throws if a fact has none of the three, or an override is invalid, so the
 * result is always complete.
 */
export function buildFacts(input: {
	isos: readonly string[];
	fetched: ReadonlyMap<string, Partial<CountryFacts>>;
	previous: Readonly<Record<string, CountryFacts>>;
	overrides: Readonly<Record<string, FactOverride>>;
}): { facts: Record<string, CountryFacts>; changes: Change[]; kept: Kept[] } {
	const isoSet = new Set(input.isos);
	const facts: Record<string, CountryFacts> = {};
	const changes: Change[] = [];
	const kept: Kept[] = [];
	const errors: string[] = [];
	/** How far to trust each neighbour list: 2 override, 1 kept old value, 0 Wikidata. */
	const trust: Record<string, number> = {};
	const resolved: Record<string, string[]> = {};

	for (const iso of Object.keys(input.overrides)) {
		if (!isoSet.has(iso))
			errors.push(`${iso}: override for an unknown country`);
	}

	for (const iso of [...input.isos].sort()) {
		const previous = input.previous[iso];
		const override = input.overrides[iso];
		const fetched = input.fetched.get(iso) ?? {};
		const entry: Partial<Record<FactField, unknown>> = {};
		trust[iso] = 0;

		for (const field of factFields) {
			const pinned = override?.[field];
			if (pinned !== undefined) {
				const problem = problemWith(field, pinned.value, isoSet, iso);
				if (problem) errors.push(`${iso}.${field}: the override ${problem}`);
				if (!pinned.reason.trim()) {
					errors.push(`${iso}.${field}: the override has no reason`);
				}
				entry[field] = pinned.value;
				if (field === "neighbours") trust[iso] = 2;
				continue;
			}
			let why = "Wikidata has no usable value";
			if (fetched[field] !== undefined) {
				const problem = problemWith(field, fetched[field], isoSet, iso);
				const suspicious =
					problem === undefined && previous
						? suspiciousChange(field, previous, {
								...previous,
								[field]: fetched[field],
							})
						: undefined;
				if (!problem && !suspicious) {
					entry[field] = fetched[field];
					continue;
				}
				why = `Wikidata's value (${show(fetched[field])}) was not taken: ${problem ?? suspicious}`;
			}
			if (previous) {
				entry[field] = previous[field];
				if (field === "neighbours") trust[iso] = 1;
				kept.push({ iso, field, why });
			} else {
				errors.push(`${iso}.${field}: ${why}, and there is no earlier value`);
			}
		}

		facts[iso] = entry as CountryFacts;
	}

	// A border has two sides, and they must agree. Where they don't, the side we
	// trust more decides: an override, then a kept old value, then Wikidata. So an
	// override on one side is enough, and keeping one country's old neighbours
	// can't leave a border half there.
	const lists = (iso: string, other: string) =>
		facts[iso]?.neighbours?.includes(other) ?? false;
	for (const iso of Object.keys(facts)) {
		const entry = facts[iso] as CountryFacts;
		if (!Array.isArray(entry.neighbours)) continue;
		const candidates = new Set(entry.neighbours);
		for (const other of Object.keys(facts)) {
			if (lists(other, iso)) candidates.add(other);
		}
		const settled: string[] = [];
		for (const other of [...candidates].sort()) {
			const [mine, theirs] = [trust[iso] ?? 0, trust[other] ?? 0];
			if (
				mine === 2 &&
				theirs === 2 &&
				lists(iso, other) !== lists(other, iso)
			) {
				errors.push(
					`The overrides for ${iso} and ${other} disagree on their border`,
				);
			}
			const border =
				mine > theirs
					? lists(iso, other)
					: theirs > mine
						? lists(other, iso)
						: lists(iso, other) && lists(other, iso);
			if (border) settled.push(other);
		}
		resolved[iso] = settled;
	}
	for (const [iso, neighbours] of Object.entries(resolved)) {
		(facts[iso] as CountryFacts).neighbours = neighbours;
	}

	for (const iso of Object.keys(facts)) {
		const previous = input.previous[iso];
		if (!previous) continue;
		for (const field of factFields) {
			const before = show(previous[field]);
			const after = show(facts[iso]?.[field]);
			if (before !== after) changes.push({ iso, field, before, after });
		}
	}

	if (errors.length > 0) {
		throw new Error(`The facts are not complete:\n- ${errors.join("\n- ")}`);
	}
	return { facts, changes, kept };
}

/** The generated `facts.ts`: one fact per line, so a diff shows what changed. */
export function renderFactsFile(facts: Record<string, CountryFacts>): string {
	const lines = [
		"// GENERATED by scripts/build-facts.ts from Wikidata (CC0). Do not edit by hand:",
		"// the next run overwrites it. To correct a value, add it to facts-overrides.ts.",
		"",
		'import type { CountryFacts } from "./facts-types";',
		"",
		"export const facts: Record<string, CountryFacts> = {",
	];
	for (const iso of Object.keys(facts).sort()) {
		const entry = facts[iso] as CountryFacts;
		lines.push(`\t${iso}: {`);
		for (const field of factFields) {
			lines.push(`\t\t${field}: ${JSON.stringify(entry[field])},`);
		}
		lines.push("\t},");
	}
	lines.push("};", "");
	return lines.join("\n");
}

/** The pull request's description: what changed, and what needs a look. */
export function renderReport(
	changes: readonly Change[],
	kept: readonly Kept[],
	names: Readonly<Record<string, string>>,
): string {
	const lines = [
		"The monthly refresh of the country facts from Wikidata (ADR 0012).",
		"Review each change below like any other change: Wikidata is crowd-edited.",
		"To reject or pin a value, add it to `facts-overrides.ts`.",
		"",
		`## Changed (${changes.length})`,
		"",
	];
	if (changes.length === 0) lines.push("Nothing.");
	for (const { iso, field, before, after } of changes) {
		lines.push(`- **${names[iso] ?? iso}**, ${field}: ${before} → ${after}`);
	}
	lines.push("", `## Kept the old value, needs a look (${kept.length})`, "");
	if (kept.length === 0) lines.push("Nothing.");
	for (const { iso, field, why } of kept) {
		lines.push(`- **${names[iso] ?? iso}**, ${field}: ${why}`);
	}
	lines.push("");
	return lines.join("\n");
}
