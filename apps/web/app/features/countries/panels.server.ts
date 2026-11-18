// The data behind the map shell's three panels (ADR 0010). The facts are
// reference data (ADR 0012) and stay on the server: a page gets one country's.
import {
	type Continent,
	continents,
	countries,
	type RegionId,
	regions,
} from "./countries";
import { facts } from "./facts";
import { formatFacts } from "./format";
import type {
	ContinentPanelData,
	CountryPanelData,
	WorldPanelData,
} from "./panel-types";

const byIso = new Map(countries.map((country) => [country.iso, country]));
const continentIds = Object.keys(continents) as Continent[];
const regionIds = Object.keys(regions) as RegionId[];

const countriesIn = (continent: Continent) =>
	countries.filter((country) => country.continent === continent);

export function worldPanel(): WorldPanelData {
	return {
		countryCount: countries.length,
		continents: continentIds.map((id) => ({
			id,
			name: continents[id].name,
			countryCount: countriesIn(id).length,
		})),
	};
}

export function continentPanel(continent: Continent): ContinentPanelData {
	return {
		id: continent,
		name: continents[continent].name,
		countryCount: countriesIn(continent).length,
		regions: regionIds
			.filter((id) => regions[id].continent === continent)
			.map((id) => ({
				id,
				name: regions[id].name,
				countries: countries
					.filter((country) => country.region === id)
					.map(({ iso, name }) => ({ iso, name })),
			})),
	};
}

/** `iso` must be a country in scope: the route checks the address first. */
export function countryPanel(iso: string): CountryPanelData {
	const country = byIso.get(iso);
	const countryFacts = facts[iso];
	if (!country || !countryFacts) throw new Error(`No country ${iso}`);
	return {
		iso,
		name: country.name,
		continent: {
			id: country.continent,
			name: continents[country.continent].name,
		},
		region: { id: country.region, name: regions[country.region].name },
		facts: formatFacts(countryFacts),
		neighbours: countryFacts.neighbours
			.flatMap((neighbour) => byIso.get(neighbour) ?? [])
			.map(({ iso, name }) => ({ iso, name }))
			.sort((a, b) => a.name.localeCompare(b.name, "en")),
	};
}
