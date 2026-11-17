// What the map can show, and where the camera goes for it. The URL decides the
// view (ADR 0010); the map component only follows.
import type { Continent } from "../countries";
import { equalEarth, equalEarthProjection } from "./equal-earth";
import type { MapCountryFeature } from "./map-file";

export type MapView =
	| { kind: "world" }
	| { kind: "continent"; continent: Continent }
	| { kind: "country"; iso: string };

/** South-west and north-east corners, in longitude and latitude. */
export type Bounds = [
	[west: number, south: number],
	[east: number, north: number],
];

/**
 * The whole map. Longitudes run from -169 to 191, because the map's edge is the
 * Bering Strait and not the 180° line (ADR 0020).
 */
export const WORLD_BOUNDS: Bounds = [
	[-169, -56],
	[191, 78],
];

export const CONTINENT_BOUNDS: Record<Continent, Bounds> = {
	africa: [
		[-26, -36],
		[60, 38],
	],
	// Europe ends near the Urals. The rest of Russia is reached by panning.
	europe: [
		[-25, 34],
		[50, 72],
	],
	asia: [
		[25, -12],
		[150, 56],
	],
	"north-america": [
		[-169, 6],
		[-50, 75],
	],
	"south-america": [
		[-83, -57],
		[-33, 14],
	],
	oceania: [
		[110, -50],
		[191, 22],
	],
};

/** A country with no shape, or a tiny one, still gets a view this many degrees across. */
const SMALLEST_VIEW = 4;

function ringContains(
	ring: [number, number][],
	[x, y]: [number, number],
): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [x0, y0] = ring[i] as [number, number];
		const [x1, y1] = ring[j] as [number, number];
		if (y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0) {
			inside = !inside;
		}
	}
	return inside;
}

/**
 * The box around the piece of land a country's label is on: the mainland, or the
 * main island. Framing every piece would zoom far out for France or the United
 * States. A very small country gets a box a few degrees across around it.
 */
export function countryBounds(country: MapCountryFeature): Bounds {
	const label = country.properties.label;
	const outerRings = country.geometry.coordinates.flatMap(([outer]) =>
		outer ? [outer] : [],
	);
	const ring = outerRings.find((outer) => ringContains(outer, label));

	// Starts from the label point itself: two are hand-set (ADR 0020). A loop,
	// because a large country's coast has more points than Math.min can take.
	let [west, south] = label;
	let [east, north] = label;
	for (const [lng, lat] of ring ?? []) {
		west = Math.min(west, lng);
		east = Math.max(east, lng);
		south = Math.min(south, lat);
		north = Math.max(north, lat);
	}

	const padLng = Math.max(0, SMALLEST_VIEW - (east - west)) / 2;
	const padLat = Math.max(0, SMALLEST_VIEW - (north - south)) / 2;
	return [
		[west - padLng, south - padLat],
		[east + padLng, north + padLat],
	];
}

/** MapLibre draws the whole world square 512 px wide at zoom 0. */
const WORLD_SQUARE_PX = 512;

/**
 * Where the camera goes to show a box of longitude and latitude in Equal Earth:
 * the centre, and the zoom at which the box just fits the viewport.
 *
 * MapLibre's own fitBounds only looks at the box's corners. In Equal Earth a box
 * is widest at the latitude nearest the equator, not at its corners, so the
 * edges are followed here.
 */
export function cameraFor(
	[[west, south], [east, north]]: Bounds,
	viewport: { width: number; height: number },
	padding = 24,
): { center: [lng: number, lat: number]; zoom: number } {
	let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
	const STEPS = 16;
	for (let i = 0; i <= STEPS; i++) {
		const lng = west + ((east - west) * i) / STEPS;
		const lat = south + ((north - south) * i) / STEPS;
		for (const point of [
			[lng, south],
			[lng, north],
			[west, lat],
			[east, lat],
		]) {
			const [x = 0, y = 0] = equalEarth.forward(point);
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	const metresPerSquare = equalEarthProjection.tileMatrixSet.extentAtZoom0;
	const scaleToFit = (pixels: number, metres: number) =>
		(Math.max(1, pixels - 2 * padding) * metresPerSquare) /
		(WORLD_SQUARE_PX * metres);
	const zoom = Math.log2(
		Math.min(
			scaleToFit(viewport.width, maxX - minX),
			scaleToFit(viewport.height, maxY - minY),
		),
	);

	const middle = equalEarth.inverse([(minX + maxX) / 2, (minY + maxY) / 2]);
	return {
		center: [
			middle?.[0] ?? (west + east) / 2,
			middle?.[1] ?? (south + north) / 2,
		],
		zoom,
	};
}
