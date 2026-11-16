// Wikidata + overrides → app/features/countries/facts.ts (ADR 0012).
//
//   node scripts/build-facts.ts [--report <file>]
//
// Run monthly by .github/workflows/facts.yml, which opens a pull request with the
// result. It has no dependencies, so the job needs no install. It writes nothing
// unless every country ends up with a complete entry: see buildFacts in facts-rules.ts.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { countries } from "../app/features/countries/countries.ts";
import { factOverrides } from "../app/features/countries/facts-overrides.ts";
import type { CountryFacts } from "../app/features/countries/facts-types.ts";
import {
	buildFacts,
	parseStatements,
	pickCapitals,
	pickGovernment,
	pickLanguages,
	pickNeighbours,
	pickPopulation,
	renderFactsFile,
	renderReport,
	type Statement,
} from "./facts-rules.ts";
import { wikidataIds } from "./wikidata-ids.ts";

const ENDPOINT = "https://query.wikidata.org/sparql";
const factsUrl = new URL("../app/features/countries/facts.ts", import.meta.url);

const items = countries.map((country) => {
	const id = wikidataIds[country.iso];
	if (!id) throw new Error(`${country.iso} has no entry in wikidata-ids.ts`);
	return `wd:${id}`;
});

/** Every statement of one property for all countries, with rank and qualifiers. */
function query(property: string): string {
	return `SELECT ?item ?value ?valueLabel ?rank ?end ?time ?role ?nature WHERE {
  VALUES ?item { ${items.join(" ")} }
  ?item p:${property} ?s. ?s ps:${property} ?value; wikibase:rank ?rank.
  OPTIONAL { ?s pq:P582 ?end }
  OPTIONAL { ?s pq:P585 ?time }
  OPTIONAL { ?s pq:P3831 ?role }
  OPTIONAL { ?s pq:P5102 ?nature }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

async function fetchStatements(property: string): Promise<Statement[]> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= 4; attempt++) {
		try {
			const response = await fetch(ENDPOINT, {
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded",
					accept: "application/sparql-results+json",
					"user-agent": "country-facts-build/1.0",
				},
				body: new URLSearchParams({ query: query(property) }),
				signal: AbortSignal.timeout(90_000),
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			// A cut-off body (Wikidata's way of reporting a timeout) fails to parse here.
			return parseStatements(JSON.parse(await response.text()));
		} catch (error) {
			lastError = error;
			console.error(`${property}, attempt ${attempt}: ${error}`);
			await new Promise((resolve) => setTimeout(resolve, attempt * 10_000));
		}
	}
	throw new Error(`Wikidata didn't answer for ${property}`, {
		cause: lastError,
	});
}

const [capital, language, population, government, border] = [
	await fetchStatements("P36"),
	await fetchStatements("P37"),
	await fetchStatements("P1082"),
	await fetchStatements("P122"),
	await fetchStatements("P47"),
];

const isoByItem = new Map(
	countries.map((country) => [wikidataIds[country.iso] as string, country.iso]),
);
const neighbours = pickNeighbours(border, isoByItem);
const of = (statements: Statement[], item: string) =>
	statements.filter((statement) => statement.item === item);

const fetched = new Map<string, Partial<CountryFacts>>();
for (const [item, iso] of isoByItem) {
	fetched.set(iso, {
		capitals: pickCapitals(of(capital, item)),
		languages: pickLanguages(of(language, item)),
		population: pickPopulation(of(population, item)),
		government: pickGovernment(of(government, item)),
		neighbours: neighbours.get(iso),
	});
}

const previous: Record<string, CountryFacts> = existsSync(factsUrl)
	? (await import(factsUrl.href)).facts
	: {};

const { facts, changes, kept } = buildFacts({
	isos: countries.map((country) => country.iso),
	fetched,
	previous,
	overrides: factOverrides,
});

const rendered = renderFactsFile(facts);
const unchanged =
	existsSync(factsUrl) && readFileSync(factsUrl, "utf8") === rendered;
if (!unchanged) writeFileSync(factsUrl, rendered);

const names = Object.fromEntries(
	countries.map((country) => [country.iso, country.name]),
);
const report = renderReport(changes, kept, names);
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag === -1 ? undefined : process.argv[reportFlag + 1];
if (reportPath) writeFileSync(reportPath, report);
console.log(report);
console.log(
	unchanged ? "facts.ts is up to date." : `Wrote ${fileURLToPath(factsUrl)}.`,
);
