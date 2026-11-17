// The format of the generated map file, ./geometry/world.json
// (scripts/build-maps.ts, ADR 0020).
//
// It is GeoJSON that MapLibre can draw as it is (ADR 0021). Coordinates are
// longitude and latitude. Longitudes run from -169 to 191, not -180 to 180: the
// map's edge is the Bering Strait, so no shape is split at the 180° line.

/** One polygon: its outer ring first, then any holes. Each ring ends where it starts. */
type PolygonCoordinates = [lng: number, lat: number][][];

export type MapCountryFeature = {
	type: "Feature";
	properties: {
		/** ISO 3166-1 alpha-2, as in the country list. */
		iso: string;
		/** Where the country's label and its marker dot go. */
		label: [lng: number, lat: number];
		/**
		 * How big the country's largest piece of land is: the side of a square of
		 * the same area, in kilometres. The map shows a marker dot for a country
		 * while this is too few pixels to click.
		 */
		sizeKm: number;
	};
	geometry: { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };
};

/** Land that isn't a country in our list: never clickable, never coloured. */
export type MapNeutralFeature = {
	type: "Feature";
	properties: { neutral: true };
	geometry: { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };
};

export type MapFile = {
	type: "FeatureCollection";
	/** The countries in alphabetical order of ISO code, then the neutral land. */
	features: (MapCountryFeature | MapNeutralFeature)[];
};
