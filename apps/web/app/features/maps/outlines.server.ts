// The outlines on the panels' tiles, read on the server (ADR 0020). A loader
// returns them and they arrive in the page's HTML: they are never fetched by
// the browser, and never part of its JavaScript.
import type { Continent } from "../countries";
import africa from "./geometry/outlines/africa.json";
import asia from "./geometry/outlines/asia.json";
import continents from "./geometry/outlines/continents.json";
import europe from "./geometry/outlines/europe.json";
import northAmerica from "./geometry/outlines/north-america.json";
import oceania from "./geometry/outlines/oceania.json";
import southAmerica from "./geometry/outlines/south-america.json";
import type { ContinentOutlines, CountryOutlines } from "./outline-file";

const byContinent: Record<Continent, CountryOutlines> = {
	africa,
	europe,
	asia,
	"north-america": northAmerica,
	"south-america": southAmerica,
	oceania,
};

/**
 * The outline of every country in a continent, by ISO code. Each is the path
 * data for `<svg viewBox="0 0 100 100"><path d={outline} /></svg>`.
 */
export function countryOutlines(continent: Continent): CountryOutlines {
	return byContinent[continent];
}

/** The outline of each of the six continents, for the same `<svg>`. */
export function continentOutlines(): ContinentOutlines {
	return continents;
}
