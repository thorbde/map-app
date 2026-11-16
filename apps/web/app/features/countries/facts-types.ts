// The reference facts shown in a country's fact box (ADR 0012).

export type CountryFacts = {
	/** Usually one. Several where a country has several (South Africa, Bolivia). */
	capitals: string[];
	/** Official languages. */
	languages: string[];
	population: { count: number; year: number };
	government: string;
	/** ISO codes of the countries in scope that share a land border. Empty for islands. */
	neighbours: string[];
};

/**
 * Hand-written corrections for one country. A fact given here wins over Wikidata.
 * Each one says why Wikidata's value isn't used.
 */
export type FactOverride = {
	[Field in keyof CountryFacts]?: {
		value: CountryFacts[Field];
		reason: string;
	};
};
