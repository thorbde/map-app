// Which country names the map shows, and which gives way when two collide.
//
// The numbers are Natural Earth's own (ADR 0020, ./map-file.ts): the zoom a
// name appears at, and a rank. MapLibre does the placing (ADR 0021); this file
// only hands it the numbers. There are no marker dots: a country too small to
// click is opened by its name.
import type { MapCountryFeature } from "./map-file";

/**
 * Added to Natural Earth's zooms. One level of it is arithmetic: they count the
 * world as 256 px wide at zoom 0, and MapLibre counts 512. The other half was
 * set by eye in Equal Earth, at world, continent and country zoom. Change this
 * one number to show more names (lower) or fewer (higher).
 */
export const LABEL_ZOOM_OFFSET = -1.5;

/** Written countries come before every unwritten one where names collide. */
const UNWRITTEN_AFTER = 10;

export type Place = {
	type: "Feature";
	properties: {
		iso: string;
		name: string;
		written: boolean;
		/**
		 * The zoom the name shows from. Once it shows it stays: we have no city
		 * names to take over, so Natural Earth's upper zoom isn't used.
		 */
		showFrom: number;
		/** Which name stays when two collide: lower numbers first. */
		rank: number;
	};
	geometry: { type: "Point"; coordinates: [number, number] };
};

/** A point per country, for its name. */
export function placesOf(
	countries: MapCountryFeature[],
	names: Readonly<Record<string, string>>,
	writtenCountries: readonly string[],
): { type: "FeatureCollection"; features: Place[] } {
	const written = new Set(writtenCountries);
	return {
		type: "FeatureCollection",
		features: countries.map(({ properties }) => {
			const isWritten = written.has(properties.iso);
			return {
				type: "Feature",
				properties: {
					iso: properties.iso,
					name: names[properties.iso] ?? properties.iso,
					written: isWritten,
					// A written country is named at every zoom.
					showFrom: isWritten ? 0 : properties.labelMinZoom + LABEL_ZOOM_OFFSET,
					rank: properties.labelRank + (isWritten ? 0 : UNWRITTEN_AFTER),
				},
				geometry: { type: "Point", coordinates: properties.label },
			};
		}),
	};
}
