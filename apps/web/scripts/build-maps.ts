// Builds the map geometry (docs/specs/mvp.md §2, ADR 0010, ADR 0020):
// Natural Earth (world-atlas) → Equal Earth → SVG path data per ISO code.
// Writes one world file and one per continent to app/features/maps/geometry/.
//
// Run with `pnpm build:maps`, and commit the result. `pnpm maps:check` fails
// when the committed files differ from a fresh build.
//
// Every border choice made here is recorded in ADR 0020, a high-risk decision.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
	type GeoPermissibleObjects,
	type GeoProjection,
	geoEqualEarth,
	geoPath,
} from "d3-geo";
import { feature, mergeArcs } from "topojson-client";
import {
	presimplify,
	simplify,
	sphericalTriangleArea,
} from "topojson-simplify";
import {
	type Continent,
	countries,
} from "../app/features/countries/countries.ts";
import type { MapCountry, MapFile } from "../app/features/maps/map-file.ts";
import { isoNumeric } from "./iso-numeric.ts";

// --- Settings -------------------------------------------------------------------

/** The width of the coordinate space. Coordinates are whole numbers. */
const WIDTH = 10000;

/**
 * The map is turned 11° so its edge runs through the Bering Strait (169° W)
 * instead of 180°. Russia and Oceania stay in one piece.
 */
const ROTATE_DEGREES = -11;

/** Each map file must stay under this, gzipped (docs/specs/m1.md). */
const BUDGET_BYTES = 50_000;

/**
 * A view is assumed to be about this many pixels on screen when deciding which
 * countries are too small to click.
 */
const NOMINAL_VIEW = { width: 1000, height: 700 };

/**
 * A country gets a marker when the square root of its largest piece's area is
 * under this many pixels in the view.
 */
const MARKER_BELOW_PX = { world: 3, continent: 8 };

/**
 * How much detail the continent files keep: points that change a shape by less
 * than this area (in coordinate units squared) are removed.
 */
const SIMPLIFY_AREA: Record<Continent, number> = {
	africa: 0.5,
	europe: 0.3,
	asia: 1.4,
	"north-america": 0.8,
	"south-america": 0.3,
	oceania: 0.5,
};

/** What each continent view shows: west, south, east, north, in degrees. */
const FRAMES: Record<Continent, [number, number, number, number]> = {
	africa: [-26, -36, 60, 38],
	europe: [-25, 34, 50, 72],
	asia: [25, -12, 150, 56],
	"north-america": [-169, 6, -50, 75],
	"south-america": [-83, -57, -33, 14],
	oceania: [110, -50, 190.9, 22],
};

type LonLatBox = [west: number, south: number, east: number, north: number];

/** Crimea, which Natural Earth draws as part of Russia. We draw it as Ukraine (ADR 0020). */
const CRIMEA: LonLatBox = [32, 44, 37, 46.5];

/**
 * Countries whose source shape includes overseas parts on another continent.
 * Only the pieces inside the box are the country; the rest is drawn as neutral
 * land, as mvp.md §2 asks for French Guiana (ADR 0020).
 * - France: French Guiana, Guadeloupe, Martinique, Réunion, Mayotte.
 * - The Netherlands: Bonaire, Sint Eustatius, Saba.
 */
const EUROPEAN_PART: Record<string, LonLatBox> = {
	FR: [-10, 40, 15, 52],
	NL: [0, 50, 10, 55],
};

/**
 * Label points that can't be the middle of the largest piece of land.
 * - Kiribati's largest island, Kiritimati, is 3,000 km from the capital, Tarawa.
 * - Russia's middle is in Siberia, outside the Europe view where Russia belongs
 *   (M49). Its label sits in European Russia instead, east of Moscow.
 */
const ANCHOR_OVERRIDES: Record<string, [lon: number, lat: number]> = {
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

function readAtlas(resolution: "110m" | "50m" | "10m"): Atlas {
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
	if (geometry.id !== undefined) {
		return isoByNumeric.get(geometry.id) ?? null;
	}
	// Features without an ISO code: Kosovo is a country in our list (ADR 0019),
	// Somaliland is drawn as Somalia (mvp.md §2), and the rest (Northern Cyprus,
	// the Siachen Glacier and so on) stay neutral.
	if (geometry.properties?.name === "Kosovo") return "XK";
	if (geometry.properties?.name === "Somaliland") return "SO";
	return null;
}

// --- Sorting the land into countries and neutral land ---------------------------

type Land = {
	topology: Atlas;
	/** Each country's polygons, as lists of arcs. */
	byIso: Map<string, PolygonArcs[]>;
	neutral: PolygonArcs[];
};

/** The first point of a polygon's outer ring, in degrees. Enough to tell where it is. */
function firstPoint(topology: Atlas, polygon: PolygonArcs): [number, number] {
	const arcIndex = polygon[0]?.[0];
	if (arcIndex === undefined) throw new Error("A polygon without arcs");
	const arc = topology.arcs[arcIndex < 0 ? ~arcIndex : arcIndex];
	const transform = topology.transform;
	if (!arc?.[0] || !transform) throw new Error("Unexpected topology");
	// Arcs are delta-encoded: the first point is absolute, and it lies on the ring
	// whichever way the arc is walked... as long as the arc isn't reversed.
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

function inBox([lon, lat]: [number, number], box: LonLatBox): boolean {
	return lon >= box[0] && lon <= box[2] && lat >= box[1] && lat <= box[3];
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
	const collection = topology.objects.countries as unknown as {
		geometries: Geom[];
	};
	for (const geometry of collection.geometries) {
		if (geometry.properties?.name === "Antarctica") continue;
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
	// If the source data changes how it draws Crimea, stop instead of guessing.
	if (!crimeaMoved) {
		throw new Error("Crimea wasn't found as a separate piece of Russia");
	}
	return { topology, byIso, neutral };
}

/** Joins polygons into one shape, removing the borders between them. */
function merged(
	topology: Atlas,
	polygons: PolygonArcs[],
): GeoPermissibleObjects {
	const asGeometries = polygons.map(
		(arcs): PolygonObject => ({ type: "Polygon", arcs }),
	);
	return feature(topology, mergeArcs(topology, asGeometries));
}

function polygonGeometries(shape: GeoPermissibleObjects): GeoJSON.Polygon[] {
	const geometry = (shape as GeoJSON.Feature).geometry;
	if (geometry.type === "Polygon") return [geometry];
	if (geometry.type === "MultiPolygon") {
		return geometry.coordinates.map((coordinates) => ({
			type: "Polygon",
			coordinates,
		}));
	}
	return [];
}

// --- Projecting and writing paths -----------------------------------------------

type Point = [number, number];
type Ring = Point[];
type Box = [x0: number, y0: number, x1: number, y1: number];

const projection: GeoProjection = geoEqualEarth()
	.rotate([ROTATE_DEGREES, 0])
	// No resampling: every point is projected on its own, so a border shared by
	// two countries comes out identical in both.
	.precision(0)
	.fitWidth(WIDTH, { type: "Sphere" });

const HEIGHT = Math.ceil(geoPath(projection).bounds({ type: "Sphere" })[1][1]);

/**
 * Projects a polygon to rings of points, rounded to whole numbers unless `exact`.
 * Rings that collapse to nothing are dropped.
 */
function projectPolygon(polygon: GeoJSON.Polygon, exact = false): Ring[] {
	const rings: Ring[] = [];
	let ring: Ring = [];
	const addPoint = (x: number, y: number) => {
		const point: Point = exact ? [x, y] : [Math.round(x), Math.round(y)];
		const last = ring[ring.length - 1];
		if (!last || last[0] !== point[0] || last[1] !== point[1]) ring.push(point);
	};
	const context = {
		moveTo(x: number, y: number) {
			ring = [];
			rings.push(ring);
			addPoint(x, y);
		},
		lineTo: addPoint,
		closePath() {},
		// geoPath only needs these to exist.
		beginPath() {},
		arc() {},
	};
	geoPath(projection, context)(polygon);
	return rings
		.map((points) => {
			const first = points[0];
			const last = points[points.length - 1];
			const closed =
				first && last && first[0] === last[0] && first[1] === last[1];
			return closed && points.length > 1 ? points.slice(0, -1) : points;
		})
		.filter((points) => points.length >= 3 && ringArea(points) !== 0);
}

/**
 * A polygon's rings, as the pieces that are kept or left out together. Normally
 * that is the whole polygon. A polygon cut in two by the edge of the map has a
 * piece on each side, and those are handled separately.
 */
function projectPieces(polygon: GeoJSON.Polygon): Ring[][] {
	const rings = projectPolygon(polygon);
	const [x0, , x1] = boxOf(rings);
	return x1 - x0 > WIDTH / 2 ? rings.map((ring) => [ring]) : [rings];
}

function ringArea(ring: Ring): number {
	let sum = 0;
	ring.forEach(([x0, y0], i) => {
		const [x1, y1] = ring[(i + 1) % ring.length] as Point;
		sum += x0 * y1 - x1 * y0;
	});
	return Math.abs(sum / 2);
}

function ringCentre(ring: Ring): Point {
	let sum = 0;
	let cx = 0;
	let cy = 0;
	ring.forEach(([x0, y0], i) => {
		const [x1, y1] = ring[(i + 1) % ring.length] as Point;
		const cross = x0 * y1 - x1 * y0;
		sum += cross;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	});
	return [Math.round(cx / (3 * sum)), Math.round(cy / (3 * sum))];
}

function boxOf(rings: Ring[]): Box {
	const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
	for (const [x, y] of rings.flat()) {
		box[0] = Math.min(box[0], x);
		box[1] = Math.min(box[1], y);
		box[2] = Math.max(box[2], x);
		box[3] = Math.max(box[3], y);
	}
	return box;
}

function boxesTouch(a: Box, b: Box): boolean {
	return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Path data in relative commands: "m" to each ring's start, then steps, then "z". */
function pathData(rings: Ring[]): string {
	let d = "";
	let cx = 0;
	let cy = 0;
	const step = (x: number, y: number) => {
		const dx = x - cx;
		const dy = y - cy;
		cx = x;
		cy = y;
		return `${dx}${dy < 0 ? "" : " "}${dy}`;
	};
	for (const ring of rings) {
		const [start, ...rest] = ring as [Point, ...Point[]];
		d += `m${step(...start)}`;
		for (const [x, y] of rest) {
			const pair = step(x, y);
			d += pair.startsWith("-") ? pair : ` ${pair}`;
		}
		d += "z";
		// "z" moves the current point back to the ring's start.
		[cx, cy] = start;
	}
	return d;
}

// --- Frames, anchors and markers ------------------------------------------------

function frameOf([west, south, east, north]: LonLatBox): Box {
	const points: Ring = [];
	for (let i = 0; i <= 20; i++) {
		const lon = west + ((east - west) * i) / 20;
		const lat = south + ((north - south) * i) / 20;
		for (const lonLat of [
			[lon, south],
			[lon, north],
			[west, lat],
			[east, lat],
		] as Point[]) {
			points.push(projection(lonLat) as Point);
		}
	}
	const [x0, y0, x1, y1] = boxOf([points]);
	return [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)];
}

/** The world view: the full width, from the top of Greenland to Cape Horn. */
const WORLD_FRAME: Box = [
	0,
	Math.floor((projection([-ROTATE_DEGREES, 84]) as Point)[1]),
	WIDTH,
	Math.ceil((projection([-ROTATE_DEGREES, -57]) as Point)[1]),
];

/** How many screen pixels one coordinate unit is, when the frame fills the view. */
function pixelsPerUnit([x0, y0, x1, y1]: Box): number {
	return Math.min(
		NOMINAL_VIEW.width / (x1 - x0),
		NOMINAL_VIEW.height / (y1 - y0),
	);
}

type Anchor = { at: Point; largestArea: number };

/**
 * Each country's label point and the size of its largest piece, from the most
 * detailed data that has it. Used by every file, so labels and markers don't
 * move between the world and a continent.
 */
function findAnchors(lands: Land[]): Map<string, Anchor> {
	const anchors = new Map<string, Anchor>();
	for (const { iso } of countries) {
		for (const land of lands) {
			const polygons = land.byIso.get(iso);
			if (!polygons) continue;
			const rings = polygonGeometries(merged(land.topology, polygons))
				// Not rounded: the smallest countries are smaller than one unit.
				.map((polygon) => projectPolygon(polygon, true)[0])
				.filter((ring) => ring !== undefined);
			const largest = rings.sort((a, b) => ringArea(b) - ringArea(a))[0];
			const override = ANCHOR_OVERRIDES[iso];
			if (override) {
				const [x, y] = projection(override) as Point;
				anchors.set(iso, {
					at: [Math.round(x), Math.round(y)],
					largestArea: largest ? ringArea(largest) : 0,
				});
				break;
			}
			if (!largest) continue;
			anchors.set(iso, {
				at: ringCentre(largest),
				largestArea: ringArea(largest),
			});
			break;
		}
		if (!anchors.has(iso)) throw new Error(`No geometry at all for ${iso}`);
	}
	return anchors;
}

// --- Building a file ------------------------------------------------------------

function simplified(land: Land, area: number): Land {
	// Equal Earth keeps areas true, so an area on the map is an area on the globe
	// times the scale squared.
	const minWeight = area / projection.scale() ** 2;
	const topology = simplify(
		presimplify(
			land.topology as Parameters<typeof presimplify>[0],
			sphericalTriangleArea,
		),
		minWeight,
	) as Atlas;
	return { ...land, topology };
}

function buildFile(
	land: Land,
	anchors: Map<string, Anchor>,
	frame: Box,
	continent: Continent | null,
): MapFile {
	const markerBelow =
		(continent ? MARKER_BELOW_PX.continent : MARKER_BELOW_PX.world) /
		pixelsPerUnit(frame);
	const inFrame = (rings: Ring[]) =>
		continent === null || boxesTouch(boxOf(rings), frame);

	const result: Record<string, MapCountry> = {};
	for (const { iso, continent: home } of [...countries].sort((a, b) =>
		a.iso < b.iso ? -1 : 1,
	)) {
		const own = continent === null || home === continent;
		const polygons = land.byIso.get(iso) ?? [];
		const rings =
			polygons.length === 0
				? []
				: polygonGeometries(merged(land.topology, polygons))
						.flatMap(projectPieces)
						// A country of this continent is drawn whole. A neighbour only
						// brings the pieces that reach into the frame.
						.filter(
							(polygon) => polygon.length > 0 && (own || inFrame(polygon)),
						)
						.flat();
		if (!own && rings.length === 0) continue;

		const anchor = anchors.get(iso);
		if (!anchor) throw new Error(`No anchor for ${iso}`);
		const country: MapCountry = { at: anchor.at };
		if (rings.length > 0) country.d = pathData(rings);
		if (rings.length === 0 || Math.sqrt(anchor.largestArea) < markerBelow) {
			country.marker = true;
		}
		if (!own) country.neighbour = true;
		result[iso] = country;
	}

	const neutralRings = polygonGeometries(merged(land.topology, land.neutral))
		.flatMap(projectPieces)
		.filter((polygon) => polygon.length > 0 && inFrame(polygon))
		.flat();

	const [x0, y0, x1, y1] = frame;
	return {
		width: WIDTH,
		height: HEIGHT,
		frame: [x0, y0, x1 - x0, y1 - y0],
		countries: result,
		neutral: pathData(neutralRings),
	};
}

// --- Main -----------------------------------------------------------------------

const outDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../app/features/maps/geometry",
);
mkdirSync(outDir, { recursive: true });

const coarse = sortLand(readAtlas("110m"));
const detailed = sortLand(readAtlas("50m"));
// The 10m data is only used to place the few countries the 50m data lacks (Tuvalu).
const anchors = findAnchors([detailed, sortLand(readAtlas("10m"))]);

const files: [name: string, file: MapFile][] = [];

files.push(["world", buildFile(coarse, anchors, WORLD_FRAME, null)]);

for (const continent of Object.keys(FRAMES) as Continent[]) {
	const land = simplified(detailed, SIMPLIFY_AREA[continent]);
	files.push([
		continent,
		buildFile(land, anchors, frameOf(FRAMES[continent]), continent),
	]);
}

let overBudget = false;
for (const [name, file] of files) {
	const json = `${JSON.stringify(file)}\n`;
	const size = gzipSync(json, { level: 9 }).length;
	const all = Object.values(file.countries);
	console.log(
		`${name.padEnd(14)} ${(size / 1000).toFixed(1).padStart(5)} KB gzipped, ` +
			`${all.length} countries, ${all.filter((c) => c.marker).length} markers, ` +
			`${all.filter((c) => c.neighbour).length} neighbours`,
	);
	if (size > BUDGET_BYTES) overBudget = true;
	writeFileSync(resolve(outDir, `${name}.json`), json);
}
if (overBudget) {
	throw new Error(`A map file is over the budget of ${BUDGET_BYTES} bytes`);
}
