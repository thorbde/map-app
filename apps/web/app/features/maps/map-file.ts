// The format of the generated map files in ./geometry (scripts/build-maps.ts, ADR 0020).
//
// Each file is GeoJSON that MapLibre can draw as it is (ADR 0021). Coordinates are
// longitude and latitude. Longitudes run from -169 to 191, not -180 to 180: the
// map's edge is the Bering Strait, so no shape is split at the 180° line.

import type { Continent } from "../countries";

/** One polygon: its outer ring first, then any holes. Each ring ends where it starts. */
type PolygonCoordinates = [lng: number, lat: number][][];

export type MapCountryFeature = {
	type: "Feature";
	properties: {
		/** ISO 3166-1 alpha-2, as in the country list. */
		iso: string;
		/** Where a label or a marker dot goes. The same point in every file. */
		label: [lng: number, lat: number];
		/** Too small to click at this file's level of detail: draw a marker dot. */
		marker?: true;
	};
	/** Null when the country is too small to have a shape in this file. */
	geometry: { type: "MultiPolygon"; coordinates: PolygonCoordinates[] } | null;
};

/** Land that isn't a country in our list: never clickable, never coloured. */
export type MapNeutralFeature = {
	type: "Feature";
	/** The continent whose file this land is in: that of the nearest country. */
	properties: { neutral: true; continent: Continent };
	geometry: { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };
};

export type MapFile = {
	type: "FeatureCollection";
	/**
	 * The countries in alphabetical order of ISO code, then the neutral land: one
	 * feature per continent in the world file, and one in a continent's file.
	 */
	features: (MapCountryFeature | MapNeutralFeature)[];
};
