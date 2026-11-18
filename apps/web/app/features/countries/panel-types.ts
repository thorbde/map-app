// What the three panels of the map shell show (ADR 0010). Built on the server
// by panels.server.ts; the components only lay it out.
import type { Continent, RegionId } from "./countries";

type Place = { iso: string; name: string };

export type WorldPanelData = {
	countryCount: number;
	continents: { id: Continent; name: string; countryCount: number }[];
};

export type ContinentPanelData = {
	id: Continent;
	name: string;
	countryCount: number;
	regions: { id: RegionId; name: string; countries: Place[] }[];
};

/** One row of the fact box. Several values (capitals, languages) are shown as tags. */
export type Fact = { label: string; values: string[] };

export type CountryPanelData = Place & {
	continent: { id: Continent; name: string };
	region: { id: RegionId; name: string };
	facts: Fact[];
	neighbours: Place[];
};

/**
 * Where the panels' links lead. The addresses belong to the routes (they are
 * temporary until profiles, docs/specs/m1.md), so the routes hand them in.
 */
export type PanelPaths = {
	world: string;
	continent: (continent: Continent, region?: RegionId) => string;
	country: (iso: string) => string;
};
