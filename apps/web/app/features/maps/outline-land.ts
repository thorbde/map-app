// Which land an outline shows (ADR 0020): the main body of a country with its
// nearby islands, as established sets of country outlines draw it. It starts
// from the map's own views (views.ts), written here so that the build script
// can read them too. outlines.test.ts fails if they and views.ts ever differ.

import type { Continent } from "../countries";
import type { MapCountryFeature } from "./map-file";

type Point = [lng: number, lat: number];
type Polygon = MapCountryFeature["geometry"]["coordinates"][number];

/** Land this close to a name that is off the land is the country's land. As in views.ts. */
const NEAR_LABEL_KM = 150;

function kmBetween([lngA, latA]: Point, [lngB, latB]: Point): number {
	const KM_PER_DEGREE = 111.2;
	const narrowing = Math.cos((((latA + latB) / 2) * Math.PI) / 180);
	return Math.hypot((lngA - lngB) * narrowing, latA - latB) * KM_PER_DEGREE;
}

function ringContains(ring: Point[], [x, y]: Point): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [x0, y0] = ring[i] as Point;
		const [x1, y1] = ring[j] as Point;
		if (y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0) {
			inside = !inside;
		}
	}
	return inside;
}

/**
 * The land the map's country view frames (`countryBounds` in views.ts): the
 * piece of land the name is on, or, for a name beside or between its land, the
 * land within 150 km of it.
 */
export function landNearName(country: MapCountryFeature): Polygon[] {
	const label = country.properties.label;
	const polygons = country.geometry.coordinates;
	const onLand = polygons.find(
		([outer]) => outer && ringContains(outer, label),
	);
	if (onLand) return [onLand];
	return polygons.filter(([outer]) =>
		outer?.some((point) => kmBetween(point, label) < NEAR_LABEL_KM),
	);
}

/** A piece of land, a few hundred points of its coast, and the box around it. */
function measured(polygon: Polygon) {
	const outer = polygon[0] ?? [];
	const points = outer.filter(
		(_, i) => i % Math.ceil(outer.length / 300) === 0,
	);
	const lngs = points.map(([lng]) => lng);
	const lats = points.map(([, lat]) => lat);
	return {
		polygon,
		points,
		west: Math.min(...lngs),
		east: Math.max(...lngs),
		south: Math.min(...lats),
		north: Math.max(...lats),
	};
}

type Measured = ReturnType<typeof measured>;

function withinReach(a: Measured, b: Measured): boolean {
	// The boxes first: most pieces are nowhere near each other.
	const degrees = NEAR_LABEL_KM / 111.2;
	const narrowest = Math.cos(
		(Math.min(89, Math.max(Math.abs(a.south), Math.abs(a.north))) * Math.PI) /
			180,
	);
	if (
		a.south - b.north > degrees ||
		b.south - a.north > degrees ||
		a.west - b.east > degrees / narrowest ||
		b.west - a.east > degrees / narrowest
	) {
		return false;
	}
	return a.points.some((point) =>
		b.points.some((other) => kmBetween(point, other) < NEAR_LABEL_KM),
	);
}

/**
 * The land a country's outline shows: the land near its name, and all land
 * within 150 km of land already in, and so on outward. Islands that belong
 * together stay together (Indonesia, Denmark, Japan); land far off on its own
 * is left out (Alaska, Hawaii, Svalbard, the Azores, the Canaries).
 */
export function landInReach(country: MapCountryFeature): Polygon[] {
	const named = new Set(landNearName(country));
	const pieces = country.geometry.coordinates.map(measured);
	let reached = pieces.filter((piece) => named.has(piece.polygon));
	let rest = pieces.filter((piece) => !named.has(piece.polygon));
	for (let edge = reached; edge.length > 0; ) {
		const next = rest.filter((piece) =>
			edge.some((from) => withinReach(piece, from)),
		);
		rest = rest.filter((piece) => !next.includes(piece));
		reached = [...reached, ...next];
		edge = next;
	}
	return reached.map((piece) => piece.polygon);
}

/**
 * The part of the map a continent's outline shows: the continent view's own
 * box (`CONTINENT_BOUNDS` in views.ts), as west, south, east, north. So
 * Europe's outline ends near the Urals, as its view does.
 */
export const CONTINENT_FRAMES: Record<
	Continent,
	[west: number, south: number, east: number, north: number]
> = {
	africa: [-26, -36, 60, 38],
	europe: [-25, 34, 50, 72],
	asia: [25, -12, 150, 56],
	"north-america": [-169, 6, -50, 75],
	"south-america": [-83, -57, -33, 14],
	oceania: [110, -50, 191, 22],
};
