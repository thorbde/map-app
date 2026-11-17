// Builds the map geometry (docs/specs/mvp.md §2, ADR 0020, ADR 0021):
// Natural Earth (world-atlas) → country shapes per ISO code, as GeoJSON that
// MapLibre draws. Writes one detailed file of the whole world,
// app/features/maps/geometry/world.json.
//
// One file, at one level of detail: MapLibre itself draws a suitably simplified
// version at each zoom, so there is nothing to swap as the viewer zooms.
//
// Run with `pnpm build:maps`, and commit the result. `pnpm maps:check` fails
// when the committed file differs from a fresh build.
//
// EVERY BORDER CHOICE made here is recorded in ADR 0020, a high-risk decision.
// Change the two together, and add a test for the choice in geometry.test.ts.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature, mergeArcs } from "topojson-client";
import {
	presimplify,
	simplify,
	sphericalTriangleArea,
} from "topojson-simplify";
import { countries } from "../app/features/countries/countries.ts";
import type {
	MapCountryFeature,
	MapFile,
	MapNeutralFeature,
} from "../app/features/maps/map-file.ts";
import { isoNumeric } from "./iso-numeric.ts";

// --- Settings -------------------------------------------------------------------

/**
 * The longitude in the middle of the map. The map's edge is then 169° W, in the
 * Bering Strait, instead of 180°: Russia and Oceania stay in one piece. Shapes
 * are cut at that edge, and longitudes run from -169 to 191.
 */
const CENTRE_LONGITUDE = 11;

/** The map file must stay under this, gzipped (ADR 0020). */
const BUDGET_BYTES = 2_500_000;

/** Decimals kept in coordinates: 0.001° is about 100 m. */
const DECIMALS = 3;

/**
 * How much detail is kept: points that change a shape by less than this area,
 * in square kilometres, are removed. The source is Natural Earth's finest
 * data (1:10 million).
 */
const SIMPLIFY_KM2 = 0.3;

type LonLat = [lng: number, lat: number];
type LonLatBox = [west: number, south: number, east: number, north: number];

// --- Border choices (ADR 0020) --------------------------------------------------

/** Crimea, which the source data draws as part of Russia. We draw it as Ukraine. */
const CRIMEA: LonLatBox = [32, 44, 37, 46.5];

/**
 * Countries whose source shape includes overseas parts on another continent.
 * Only the pieces inside the box are the country; the rest is neutral land.
 * - France: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte.
 * - The Netherlands: Bonaire, Sint Eustatius, Saba.
 */
const EUROPEAN_PART: Record<string, LonLatBox> = {
	FR: [-10, 40, 15, 52],
	NL: [0, 50, 10, 55],
};

/**
 * Features without a usable ISO code that we draw as part of a country.
 * - Kosovo is a country in our list (ADR 0019).
 * - Somaliland is drawn as Somalia (mvp.md §2).
 * - Åland is part of Finland; the source data has it as a separate shape.
 * - Baikonur is part of Kazakhstan, likewise.
 */
const NAMED_FEATURES: Record<string, string> = {
	Kosovo: "XK",
	Somaliland: "SO",
	Åland: "FI",
	// Only in the finest data. The Baikonur cosmodrome is Kazakh territory,
	// leased to Russia; the source data cuts it out of Kazakhstan.
	Baikonur: "KZ",
};

/**
 * Western Sahara, a country in our list (ADR 0019). The source data draws
 * everything west of the sand wall as Morocco, and only the strip east of it as
 * a separate shape. We draw the whole territory as Western Sahara: Morocco ends
 * at its border, the parallel 27°40′ N.
 */
const WESTERN_SAHARA = {
	iso: "EH",
	feature: "W. Sahara",
	northernBorder: 27 + 40 / 60,
};

/**
 * Label points that can't be worked out from the shape.
 * - Kiribati's largest island, Kiritimati, is 3,000 km from the capital, Tarawa.
 * - Russia's middle is in Siberia. Russia belongs to Europe (M49), so its label
 *   sits in European Russia, east of Moscow.
 */
const LABEL_OVERRIDES: Record<string, LonLat> = {
	KI: [173, 1.4],
	RU: [44, 57],
};

// --- Reading world-atlas --------------------------------------------------------

// The topology types, taken from the functions that use them.
type Atlas = Parameters<typeof mergeArcs>[0];
type PolygonObject = Extract<
	Parameters<typeof mergeArcs>[1],
	unknown[]
>[number];
type Geom = PolygonObject & { id?: string; properties?: { name?: string } };
type PolygonArcs = number[][];

const require = createRequire(import.meta.url);

function readAtlas(resolution: "50m" | "10m"): Atlas {
	const path = require.resolve(`world-atlas/countries-${resolution}.json`);
	return JSON.parse(readFileSync(path, "utf8")) as Atlas;
}

function polygonsOf(geometry: Geom): PolygonArcs[] {
	return geometry.type === "Polygon" ? [geometry.arcs] : geometry.arcs;
}

const isoByNumeric = new Map(
	Object.entries(isoNumeric).map(([iso, numeric]) => [numeric, iso]),
);

/** Which country in our list a world-atlas feature is, or null for neutral land. */
function isoOf(geometry: Geom): string | null {
	const named = NAMED_FEATURES[geometry.properties?.name ?? ""];
	if (named) return named;
	// Anything else without an ISO code we know (Northern Cyprus, the Siachen
	// Glacier, Greenland, Hong Kong and so on) is neutral land.
	return geometry.id === undefined
		? null
		: (isoByNumeric.get(geometry.id) ?? null);
}

// --- Sorting the land into countries and neutral land ---------------------------

type Land = {
	topology: Atlas;
	/** Each country's polygons, as lists of arcs. */
	byIso: Map<string, PolygonArcs[]>;
	neutral: PolygonArcs[];
};

/** The first point of a polygon's outer ring, in degrees. Enough to tell where it is. */
function firstPoint(topology: Atlas, polygon: PolygonArcs): LonLat {
	const arcIndex = polygon[0]?.[0];
	if (arcIndex === undefined) throw new Error("A polygon without arcs");
	const arc = topology.arcs[arcIndex < 0 ? ~arcIndex : arcIndex];
	const transform = topology.transform;
	if (!arc?.[0] || !transform) throw new Error("Unexpected topology");
	// Arcs are delta-encoded. Walked backwards, an arc starts at its last point.
	let [x, y] = arc[0] as [number, number];
	if (arcIndex < 0) {
		for (const [dx, dy] of arc.slice(1) as [number, number][]) {
			x += dx;
			y += dy;
		}
	}
	return [
		x * transform.scale[0] + transform.translate[0],
		y * transform.scale[1] + transform.translate[1],
	];
}

function inBox([lng, lat]: LonLat, box: LonLatBox): boolean {
	return lng >= box[0] && lng <= box[2] && lat >= box[1] && lat <= box[3];
}

function sortLand(topology: Atlas): Land {
	const byIso = new Map<string, PolygonArcs[]>();
	const neutral: PolygonArcs[] = [];
	const add = (iso: string, polygon: PolygonArcs) => {
		const list = byIso.get(iso) ?? [];
		list.push(polygon);
		byIso.set(iso, list);
	};

	let crimeaMoved = false;
	let westernSaharaFound = false;
	const collection = topology.objects.countries as unknown as {
		geometries: Geom[];
	};
	for (const geometry of collection.geometries) {
		const name = geometry.properties?.name;
		if (name === "Antarctica") continue;
		if (name === WESTERN_SAHARA.feature) {
			// Joined to Morocco here, so the sand wall between them disappears.
			// countryPolygons() then cuts the whole territory off again.
			for (const polygon of polygonsOf(geometry)) add("MA", polygon);
			westernSaharaFound = true;
			continue;
		}
		const iso = isoOf(geometry);
		const europeanPart = iso === null ? undefined : EUROPEAN_PART[iso];
		for (const polygon of polygonsOf(geometry)) {
			const where = firstPoint(topology, polygon);
			if (iso === null) {
				neutral.push(polygon);
			} else if (iso === "RU" && inBox(where, CRIMEA)) {
				add("UA", polygon);
				crimeaMoved = true;
			} else if (europeanPart && !inBox(where, europeanPart)) {
				neutral.push(polygon);
			} else {
				add(iso, polygon);
			}
		}
	}
	// If the source data changes how it draws these, stop instead of guessing.
	if (!crimeaMoved) {
		throw new Error("Crimea wasn't found as a separate piece of Russia");
	}
	if (!westernSaharaFound) {
		throw new Error(
			`No "${WESTERN_SAHARA.feature}" feature in the source data`,
		);
	}
	return { topology, byIso, neutral };
}

function simplified(land: Land, km2: number): Land {
	const EARTH_RADIUS_KM = 6371;
	const topology = simplify(
		presimplify(
			land.topology as Parameters<typeof presimplify>[0],
			sphericalTriangleArea,
		),
		km2 / EARTH_RADIUS_KM ** 2,
	) as Atlas;
	return { ...land, topology };
}

// --- From shapes on the globe to flat longitude and latitude --------------------

type Ring = LonLat[];
/** A polygon: its outer ring, then its holes. Rings are open (no repeated end point). */
type FlatPolygon = Ring[];

// world-atlas stores shapes for drawing on a sphere: a ring that crosses the
// 180° line simply jumps from 180 to -180. Drawn flat, that jump becomes a line
// across the whole map. This "projection" changes no coordinates; it only cuts
// every shape at the map's edge, which d3-geo knows how to do properly.
const cutAtEdge = geoEquirectangular()
	.rotate([-CENTRE_LONGITUDE, 0])
	.scale(180 / Math.PI)
	.translate([0, 0])
	.reflectY(true)
	.precision(0);

/** Twice the signed area of a ring, in square degrees. The sign gives its direction. */
function signedArea(ring: Ring): number {
	let sum = 0;
	ring.forEach(([x0, y0], i) => {
		const [x1, y1] = ring[(i + 1) % ring.length] as LonLat;
		sum += x0 * y1 - x1 * y0;
	});
	return sum;
}

function ringContains(ring: Ring, [x, y]: LonLat): boolean {
	let inside = false;
	ring.forEach(([x0, y0], i) => {
		const [x1, y1] = ring[(i + ring.length - 1) % ring.length] as LonLat;
		if (y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0) {
			inside = !inside;
		}
	});
	return inside;
}

/** Rounds a ring, and drops points that repeat the one before. */
function rounded(ring: Ring, decimals: number): Ring {
	const factor = 10 ** decimals;
	const result: Ring = [];
	for (const [x, y] of ring) {
		const point: LonLat = [
			Math.round(x * factor) / factor,
			Math.round(y * factor) / factor,
		];
		const last = result[result.length - 1];
		if (!last || last[0] !== point[0] || last[1] !== point[1]) {
			result.push(point);
		}
	}
	const first = result[0];
	const last = result[result.length - 1];
	if (first && last && result.length > 1) {
		if (first[0] === last[0] && first[1] === last[1]) result.pop();
	}
	return result;
}

/**
 * Turns one polygon from the source data into flat polygons, cut at the map's
 * edge. A polygon that crosses the edge comes back as two.
 */
function flatten(polygon: GeoJSON.Polygon, decimals: number): FlatPolygon[] {
	const rings: Ring[] = [];
	let ring: Ring = [];
	const context = {
		moveTo(x: number, y: number) {
			ring = [[x + CENTRE_LONGITUDE, y]];
			rings.push(ring);
		},
		lineTo(x: number, y: number) {
			ring.push([x + CENTRE_LONGITUDE, y]);
		},
		closePath() {},
		// geoPath only needs these to exist.
		beginPath() {},
		arc() {},
	};
	geoPath(cutAtEdge, context)(polygon);

	const kept = rings
		.map((points) => rounded(points, decimals))
		.filter((points) => points.length >= 3 && signedArea(points) !== 0);
	const largest = kept.reduce<Ring | undefined>(
		(best, candidate) =>
			!best || Math.abs(signedArea(candidate)) > Math.abs(signedArea(best))
				? candidate
				: best,
		undefined,
	);
	if (!largest) return [];

	// Outer rings all run the same way round, and holes the other way.
	const outerSign = Math.sign(signedArea(largest));
	const polygons: FlatPolygon[] = kept
		.filter((candidate) => Math.sign(signedArea(candidate)) === outerSign)
		.map((outer) => [outer]);
	for (const hole of kept) {
		if (Math.sign(signedArea(hole)) === outerSign) continue;
		const owner = polygons.find(([outer]) =>
			ringContains(outer as Ring, hole[0] as LonLat),
		);
		owner?.push(hole);
	}
	return polygons;
}

/** Joins polygons into one shape, removing the borders between them, and flattens it. */
function mergedAndFlat(
	topology: Atlas,
	polygons: PolygonArcs[],
	decimals: number,
): FlatPolygon[] {
	if (polygons.length === 0) return [];
	const asGeometries = polygons.map(
		(arcs): PolygonObject => ({ type: "Polygon", arcs }),
	);
	const shape = feature(topology, mergeArcs(topology, asGeometries)) as {
		geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
	};
	const parts: GeoJSON.Polygon[] =
		shape.geometry.type === "Polygon"
			? [shape.geometry]
			: shape.geometry.coordinates.map((coordinates) => ({
					type: "Polygon",
					coordinates,
				}));
	return parts.flatMap((part) => flatten(part, decimals));
}

/** The part of a ring north (or south) of a parallel. */
function clipRing(ring: Ring, latitude: number, keepNorth: boolean): Ring {
	const isKept = ([, lat]: LonLat) =>
		keepNorth ? lat >= latitude : lat <= latitude;
	const result: Ring = [];
	ring.forEach((point, i) => {
		const previous = ring[(i + ring.length - 1) % ring.length] as LonLat;
		if (isKept(point) !== isKept(previous)) {
			const t = (latitude - previous[1]) / (point[1] - previous[1]);
			result.push([previous[0] + t * (point[0] - previous[0]), latitude]);
		}
		if (isKept(point)) result.push(point);
	});
	return result;
}

function clipPolygons(
	polygons: FlatPolygon[],
	latitude: number,
	keepNorth: boolean,
	decimals: number,
): FlatPolygon[] {
	return polygons
		.map((polygon) =>
			polygon
				.map((ring) => rounded(clipRing(ring, latitude, keepNorth), decimals))
				.filter((ring) => ring.length >= 3 && signedArea(ring) !== 0),
		)
		.filter((polygon) => polygon.length > 0);
}

type Shapes = {
	byIso: Map<string, FlatPolygon[]>;
	neutral: FlatPolygon[];
};

/** Every country's flat polygons, and the neutral land, with all border choices applied. */
function shapesOf(land: Land, decimals: number): Shapes {
	const byIso = new Map<string, FlatPolygon[]>();
	const neutral = mergedAndFlat(land.topology, land.neutral, decimals);
	for (const [iso, arcs] of land.byIso) {
		let polygons = mergedAndFlat(land.topology, arcs, decimals);
		if (iso === "MA") {
			// Morocco was joined with Western Sahara in sortLand(). Cut it at its
			// border: the north is Morocco, the south is Western Sahara.
			const border = WESTERN_SAHARA.northernBorder;
			byIso.set(
				WESTERN_SAHARA.iso,
				clipPolygons(polygons, border, false, decimals),
			);
			polygons = clipPolygons(polygons, border, true, decimals);
		}
		byIso.set(iso, polygons);
	}
	return { byIso, neutral };
}

// --- Label points and sizes -----------------------------------------------------

/** A ring's area in square kilometres. */
function areaKm2(ring: Ring): number {
	// With latitude replaced by its sine, areas on the flat map are true areas.
	const EARTH_RADIUS_KM = 6371;
	const radians = Math.PI / 180;
	const equalArea = ring.map(
		([lng, lat]): LonLat => [lng * radians, Math.sin(lat * radians)],
	);
	return (Math.abs(signedArea(equalArea)) / 2) * EARTH_RADIUS_KM ** 2;
}

/** A point inside a polygon to hang a label on: its middle, if that is inside it. */
function labelPoint(polygon: FlatPolygon): LonLat {
	const outer = polygon[0] as Ring;
	const isInside = (point: LonLat) =>
		polygon.every((ring, i) => ringContains(ring, point) === (i === 0));

	const twiceArea = signedArea(outer);
	let cx = 0;
	let cy = 0;
	outer.forEach(([x0, y0], i) => {
		const [x1, y1] = outer[(i + 1) % outer.length] as LonLat;
		const cross = x0 * y1 - x1 * y0;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	});
	const middle: LonLat = [cx / (3 * twiceArea), cy / (3 * twiceArea)];
	if (isInside(middle)) return middle;

	// A bent country (Croatia, Vietnam) has its middle outside itself. Take the
	// middle of the widest stretch of the country along the same latitude.
	const crossings: number[] = [];
	for (const ring of polygon) {
		ring.forEach(([x0, y0], i) => {
			const [x1, y1] = ring[(i + 1) % ring.length] as LonLat;
			if (y0 > middle[1] !== y1 > middle[1]) {
				crossings.push(x0 + ((middle[1] - y0) / (y1 - y0)) * (x1 - x0));
			}
		});
	}
	crossings.sort((a, b) => a - b);
	let best: LonLat = middle;
	let widest = 0;
	for (let i = 0; i + 1 < crossings.length; i += 2) {
		const [from, to] = [crossings[i] as number, crossings[i + 1] as number];
		if (to - from > widest) {
			widest = to - from;
			best = [(from + to) / 2, middle[1]];
		}
	}
	return best;
}

type Label = { at: LonLat; largestKm2: number };

/**
 * Each country's label point and the size of its largest piece of land, from the
 * first of the sources that has a shape for it.
 */
function findLabels(sources: Shapes[]): Map<string, Label> {
	const labels = new Map<string, Label>();
	// Finer than the shapes' own coordinates, so a label stays on a small island.
	const round = (value: number) => Math.round(value * 10_000) / 10_000;
	for (const { iso } of countries) {
		const polygons = sources
			.map((source) => source.byIso.get(iso) ?? [])
			.find((list) => list.length > 0);
		if (!polygons) throw new Error(`No geometry at all for ${iso}`);
		const largest = polygons.reduce((best, candidate) =>
			areaKm2(candidate[0] as Ring) > areaKm2(best[0] as Ring)
				? candidate
				: best,
		);
		const [lng, lat] = LABEL_OVERRIDES[iso] ?? labelPoint(largest);
		labels.set(iso, {
			at: [round(lng), round(lat)],
			largestKm2: areaKm2(largest[0] as Ring),
		});
	}
	return labels;
}

// --- Building a file ------------------------------------------------------------

/** GeoJSON wants each ring to end where it starts. */
function closed(polygons: FlatPolygon[]): LonLat[][][] {
	return polygons.map((polygon) =>
		polygon.map((ring) => [...ring, ring[0] as LonLat]),
	);
}

function buildFile(shapes: Shapes, labels: Map<string, Label>): MapFile {
	const countryFeatures = countries
		.map((country) => country.iso)
		.sort()
		.map((iso): MapCountryFeature => {
			const label = labels.get(iso);
			const polygons = shapes.byIso.get(iso) ?? [];
			if (!label || polygons.length === 0) {
				throw new Error(`No shape for ${iso}`);
			}
			return {
				type: "Feature",
				properties: {
					iso,
					label: label.at,
					sizeKm: Math.round(Math.sqrt(label.largestKm2) * 10) / 10,
				},
				geometry: { type: "MultiPolygon", coordinates: closed(polygons) },
			};
		});

	const neutral: MapNeutralFeature = {
		type: "Feature",
		properties: { neutral: true },
		geometry: { type: "MultiPolygon", coordinates: closed(shapes.neutral) },
	};
	return { type: "FeatureCollection", features: [...countryFeatures, neutral] };
}

// --- Main -----------------------------------------------------------------------

const outDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../app/features/maps/geometry",
);
mkdirSync(outDir, { recursive: true });

const land = sortLand(readAtlas("10m"));
// The 50m data is only a fallback, for the Vatican: see below.
const fallbackLand = sortLand(readAtlas("50m"));

const shapes = shapesOf(simplified(land, SIMPLIFY_KM2), DECIMALS);
// The very smallest countries don't survive the simplifying and rounding, and
// the finest source data has the Vatican squashed flat. Each country takes the
// first of these that has a shape for it.
const untouched = [
	shapesOf(land, DECIMALS + 1),
	shapesOf(fallbackLand, DECIMALS + 1),
];
for (const { iso } of countries) {
	if ((shapes.byIso.get(iso) ?? []).length > 0) continue;
	const shape = untouched
		.map((source) => source.byIso.get(iso) ?? [])
		.find((polygons) => polygons.length > 0);
	if (shape) shapes.byIso.set(iso, shape);
}

// Label points and sizes come from the shapes as they are in the file, so a
// label is always on land that is actually drawn.
const labels = findLabels([shapes]);

const file = buildFile(shapes, labels);
const json = `${JSON.stringify(file)}\n`;
const size = gzipSync(json, { level: 9 }).length;
writeFileSync(resolve(outDir, "world.json"), json);

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;
console.log(
	`world.json: ${megabytes(size)} gzipped (budget ${megabytes(BUDGET_BYTES)}), ` +
		`${megabytes(json.length)} on disk, ${file.features.length - 1} countries`,
);
if (size > BUDGET_BYTES) {
	throw new Error("world.json is over its size budget");
}
