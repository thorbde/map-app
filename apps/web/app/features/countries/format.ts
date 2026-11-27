// How a country's reference facts (ADR 0012) read in the fact box.
import type { CountryFacts } from "./facts-types";
import type { Fact } from "./panel-types";

// The numbers are formatted by the platform (Intl), in the UI's language.
const millions = new Intl.NumberFormat("en", {
	notation: "compact",
	compactDisplay: "long",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});
const exact = new Intl.NumberFormat("en");

/** "16.9 million (2021)". Under a million the exact figure: "89,752 (2026)". */
export function formatPopulation({
	count,
	year,
}: CountryFacts["population"]): string {
	const figure =
		count >= 1_000_000 ? millions.format(count) : exact.format(count);
	return `${figure} (${year})`;
}

/** Wikidata writes government types in lower case; a fact box value starts with a capital. */
function capitalised(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The fact box's rows, in the order they are shown. Neighbours have a section of their own. */
export function formatFacts(facts: CountryFacts): Fact[] {
	return [
		{
			label: facts.capitals.length > 1 ? "Capitals" : "Capital",
			values: facts.capitals,
		},
		{
			label: facts.languages.length > 1 ? "Languages" : "Language",
			values: facts.languages,
		},
		{ label: "Population", values: [formatPopulation(facts.population)] },
		{ label: "Government", values: [capitalised(facts.government)] },
	];
}
