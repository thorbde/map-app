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
		/**
		 * Where the country's name goes: Natural Earth's label point. For a
		 * country of islands it can be in the sea between them.
		 */
		label: [lng: number, lat: number];
		/**
		 * The zoom level the name appears from and the one it disappears after, as
		 * Natural Earth has them (MIN_LABEL, MAX_LABEL). They are tuned for
		 * ordinary web maps: Russia 1.7, Denmark 3, Luxembourg 5.7.
		 */
		labelMinZoom: number;
		labelMaxZoom: number;
		/** Natural Earth's LABELRANK: 2 for the most prominent countries, up to 9. */
		labelRank: number;
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
