// Builds the map geometry (docs/specs/mvp.md §2, ADR 0020, ADR 0021):
// Natural Earth (world-atlas) → simplified country shapes per ISO code, as
// GeoJSON that MapLibre draws. Writes three levels of detail to
// app/features/maps/geometry/: a coarse world file, a detailed file per
// continent, and a fine file per country.
//
// Run with `pnpm build:maps`, and commit the result. `pnpm maps:check` fails
// when the committed files differ from a fresh build.
//
// EVERY BORDER CHOICE made here is recorded in ADR 0020, a high-risk decision.
// Change the two together, and add a test for the choice in geometry.test.ts.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
import {
	type Continent,
	countries,
} from "../app/features/countries/countries.ts";
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

/** Each map file must stay under this, gzipped (docs/specs/m1.md, ADR 0020). */
const BUDGET_BYTES = { world: 60_000, continent: 100_000, country: 250_000 };

/**
 * A country gets a marker dot when its largest piece of land is smaller than
 * this, in square kilometres, or when it has no shape in the file at all.
 */
const MARKER_BELOW_KM2 = { world: 15_000, continent: 5_000 };

/** Decimals kept in coordinates: 0.1° is about 11 km, 0.01° about 1 km, 0.001° about 100 m. */
const DECIMALS = { world: 1, continent: 2, country: 3 };

/**
 * How much detail the continent files keep: points that change a shape by less
 * than this area, in square kilometres, are removed. One value for all of them,
 * so a border comes out identical in the files on both sides of it.
 */
const SIMPLIFY_KM2 = { continent: 6, country: 0.3 };

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
 * most detailed data that has it. The same in every file, so labels and markers
 * don't move when the detailed shapes load.
 */
function findLabels(sources: Shapes[]): Map<string, Label> {
	const labels = new Map<string, Label>();
	const round = (value: number) => Math.round(value * 100) / 100;
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

/** The continent of the country whose label point is nearest: where neutral land is filed. */
function nearestContinent(
	polygon: FlatPolygon,
	labels: Map<string, Label>,
): Continent {
	const [lng, lat] = (polygon[0] as Ring)[0] as LonLat;
	const shrink = Math.cos((lat * Math.PI) / 180);
	let nearest: Continent | undefined;
	let shortest = Infinity;
	for (const country of countries) {
		const at = labels.get(country.iso)?.at;
		if (!at) continue;
		const distance = Math.hypot((at[0] - lng) * shrink, at[1] - lat);
		if (distance < shortest) {
			shortest = distance;
			nearest = country.continent;
		}
	}
	if (!nearest) throw new Error("No countries to measure against");
	return nearest;
}

const continents = [
	...new Set(countries.map((country) => country.continent)),
].sort();

function buildFile(
	shapes: Shapes,
	labels: Map<string, Label>,
	continent: Continent | null,
): MapFile {
	const markerBelow =
		continent === null ? MARKER_BELOW_KM2.world : MARKER_BELOW_KM2.continent;

	const countryFeatures = countries
		.filter((country) => continent === null || country.continent === continent)
		.map((country) => country.iso)
		.sort()
		.map((iso): MapCountryFeature => {
			const label = labels.get(iso);
			if (!label) throw new Error(`No label point for ${iso}`);
			const polygons = shapes.byIso.get(iso) ?? [];
			const hasShape = polygons.length > 0;
			return {
				type: "Feature",
				properties: {
					iso,
					label: label.at,
					...(!hasShape || label.largestKm2 < markerBelow
						? { marker: true as const }
						: {}),
				},
				geometry: hasShape
					? { type: "MultiPolygon", coordinates: closed(polygons) }
					: null,
			};
		});

	// Neutral land is one feature per continent, also in the world file, so the
	// map can swap a continent's coarse land for its detailed land in one go.
	const neutralFeatures = continents
		.filter((each) => continent === null || each === continent)
		.map(
			(each): MapNeutralFeature => ({
				type: "Feature",
				properties: { neutral: true, continent: each },
				geometry: {
					type: "MultiPolygon",
					coordinates: closed(
						shapes.neutral.filter(
							(polygon) => nearestContinent(polygon, labels) === each,
						),
					),
				},
			}),
		);
	return {
		type: "FeatureCollection",
		features: [...countryFeatures, ...neutralFeatures],
	};
}

// --- Main -----------------------------------------------------------------------

const outDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../app/features/maps/geometry",
);
mkdirSync(outDir, { recursive: true });

const detailedLand = sortLand(readAtlas("50m"));
const fineLand = sortLand(readAtlas("10m"));
const coarse = shapesOf(sortLand(readAtlas("110m")), DECIMALS.world);
const detailed = shapesOf(
	simplified(detailedLand, SIMPLIFY_KM2.continent),
	DECIMALS.continent,
);
const fine = shapesOf(
	simplified(fineLand, SIMPLIFY_KM2.country),
	DECIMALS.country,
);
// Label points come from the shapes before they are simplified and rounded:
// the smallest countries are smaller than the rounding. The 10m data places
// the few countries the 50m data lacks (Tuvalu).
const LABEL_DECIMALS = 5;
const labels = findLabels([
	shapesOf(detailedLand, LABEL_DECIMALS),
	shapesOf(fineLand, LABEL_DECIMALS),
]);

const files: [name: string, file: MapFile, budget: number][] = [
	["world", buildFile(coarse, labels, null), BUDGET_BYTES.world],
];
for (const continent of continents) {
	files.push([
		continent,
		buildFile(detailed, labels, continent),
		BUDGET_BYTES.continent,
	]);
}

// The fine level: one file per country, with only that country in it. The
// folder is emptied first, so a country that leaves the list leaves no file.
rmSync(resolve(outDir, "countries"), { recursive: true, force: true });
mkdirSync(resolve(outDir, "countries"));
// The very smallest countries don't survive the simplifying and rounding, and
// the finest source data has the Vatican squashed flat. Each country takes the
// first of these that has a shape for it.
const fineSources = [
	fine,
	shapesOf(fineLand, DECIMALS.country + 1),
	shapesOf(detailedLand, DECIMALS.country + 1),
];
for (const { iso } of countries) {
	const polygons =
		fineSources
			.map((source) => source.byIso.get(iso) ?? [])
			.find((shape) => shape.length > 0) ?? [];
	const label = labels.get(iso);
	if (polygons.length === 0 || !label) {
		throw new Error(`No fine shape for ${iso}`);
	}
	files.push([
		`countries/${iso}`,
		{
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { iso, label: label.at },
					geometry: { type: "MultiPolygon", coordinates: closed(polygons) },
				},
			],
		},
		BUDGET_BYTES.country,
	]);
}

const overBudget: string[] = [];
const countrySizes: [name: string, size: number][] = [];
for (const [name, file, budget] of files) {
	const json = `${JSON.stringify(file)}\n`;
	const size = gzipSync(json, { level: 9 }).length;
	const all = file.features.filter(
		(each): each is MapCountryFeature => "iso" in each.properties,
	);
	if (name.startsWith("countries/")) {
		countrySizes.push([name, size]);
	} else {
		console.log(
			`${name.padEnd(14)} ${(size / 1000).toFixed(1).padStart(5)} KB gzipped ` +
				`(budget ${budget / 1000}), ${all.length} countries, ` +
				`${all.filter((each) => each.properties.marker).length} markers, ` +
				`${all.filter((each) => each.geometry === null).length} without a shape`,
		);
	}
	if (size > budget) overBudget.push(name);
	writeFileSync(resolve(outDir, `${name}.json`), json);
}
countrySizes.sort((a, b) => b[1] - a[1]);
const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;
console.log(
	`countries/      ${countrySizes.length} files, ` +
		`${kb(countrySizes.reduce((sum, [, size]) => sum + size, 0))} gzipped in all ` +
		`(budget ${BUDGET_BYTES.country / 1000} each). The largest: ` +
		countrySizes
			.slice(0, 5)
			.map(([name, size]) => `${name.slice(-2)} ${kb(size)}`)
			.join(", "),
);
if (overBudget.length > 0) {
	throw new Error(`Over the size budget: ${overBudget.join(", ")}`);
}
