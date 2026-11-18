import { describe, expect, it } from "vitest";
import { type Continent, countries } from "../countries";
import { equalEarth } from "./equal-earth";
import africaText from "./geometry/outlines/africa.json?raw";
import asiaText from "./geometry/outlines/asia.json?raw";
import continentsText from "./geometry/outlines/continents.json?raw";
import europeText from "./geometry/outlines/europe.json?raw";
import northAmericaText from "./geometry/outlines/north-america.json?raw";
import oceaniaText from "./geometry/outlines/oceania.json?raw";
import southAmericaText from "./geometry/outlines/south-america.json?raw";
// As text: see geometry.test.ts.
import worldText from "./geometry/world.json?raw";
import type { MapCountryFeature, MapFile } from "./map-file";
import { OUTLINE_BOX, OUTLINE_FILE_BUDGET_BYTES } from "./outline-file";
import { CONTINENT_FRAMES, landNearName } from "./outline-land";
import { continentOutlines, countryOutlines } from "./outlines.server";
import { CONTINENT_BOUNDS, countryBounds } from "./views";

// These tests read the committed files that scripts/build-maps.ts generates.
const files: Record<Continent | "continents", string> = {
	africa: africaText,
	europe: europeText,
	asia: asiaText,
	"north-america": northAmericaText,
	"south-america": southAmericaText,
	oceania: oceaniaText,
	continents: continentsText,
};
const continentIds = Object.keys(CONTINENT_FRAMES) as Continent[];

const features = (JSON.parse(worldText) as MapFile).features.filter(
	(feature): feature is MapCountryFeature => "iso" in feature.properties,
);

function country(iso: string): MapCountryFeature {
	const feature = features.find((each) => each.properties.iso === iso);
	if (!feature) throw new Error(`No ${iso} in the world file`);
	return feature;
}

function outlineOf(iso: string): string {
	const continent = countries.find((each) => each.iso === iso)?.continent;
	if (!continent) throw new Error(`No ${iso} in the country list`);
	return countryOutlines(continent)[iso] ?? "";
}

/** The pieces of a path, each a list of points. mapshaper writes "M x y x y … Z". */
function pieces(outline: string): [x: number, y: number][][] {
	return outline
		.split("M")
		.slice(1)
		.map((piece) => {
			const numbers = piece.replace("Z", "").trim().split(/\s+/).map(Number);
			const points: [number, number][] = [];
			for (let i = 0; i < numbers.length; i += 2) {
				points.push([numbers[i] as number, numbers[i + 1] as number]);
			}
			return points;
		});
}

function box(points: [number, number][]) {
	const xs = points.map(([x]) => x);
	const ys = points.map(([, y]) => y);
	const [left, right] = [Math.min(...xs), Math.max(...xs)];
	const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
	return {
		left,
		right,
		top,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

/** Twice the area inside a piece: 0 for a piece rounded away to a point or a line. */
function doubleArea(points: [number, number][]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const [x0, y0] = points[i] as [number, number];
		const [x1, y1] = points[(i + 1) % points.length] as [number, number];
		sum += x0 * y1 - x1 * y0;
	}
	return Math.abs(sum);
}

const everyOutline: [name: string, outline: string][] = [
	...continentIds.flatMap((continent) =>
		Object.entries(countryOutlines(continent)),
	),
	...Object.entries(continentOutlines()),
];

describe("outlines: every country and continent is there", () => {
	it("has an outline for each of the 200 countries, in its continent's file", () => {
		for (const continent of continentIds) {
			expect(Object.keys(countryOutlines(continent))).toEqual(
				countries
					.filter((each) => each.continent === continent)
					.map((each) => each.iso)
					.sort(),
			);
		}
		expect(everyOutline).toHaveLength(200 + 6);
	});

	it("has an outline for each of the six continents", () => {
		expect(Object.keys(continentOutlines())).toEqual(continentIds);
	});

	it("draws something for every one: a piece of land with an area", () => {
		for (const [name, outline] of everyOutline) {
			expect(outline, name).toMatch(/^M [\d ]+Z( M [\d ]+Z)*$/);
			expect(
				pieces(outline).some((piece) => doubleArea(piece) > 0),
				name,
			).toBe(true);
		}
	});

	it("keeps every file under its size budget, gzipped", async () => {
		for (const [name, text] of Object.entries(files)) {
			const gzipped = await new Response(
				new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")),
			).arrayBuffer();
			expect(gzipped.byteLength, name).toBeLessThan(OUTLINE_FILE_BUDGET_BYTES);
		}
	});
});

describe("outlines: fitted to the box", () => {
	it("never crosses out of the box", () => {
		for (const [name, outline] of everyOutline) {
			const { left, right, top, bottom } = box(pieces(outline).flat());
			expect(left, name).toBeGreaterThanOrEqual(0);
			expect(top, name).toBeGreaterThanOrEqual(0);
			expect(right, name).toBeLessThanOrEqual(OUTLINE_BOX);
			expect(bottom, name).toBeLessThanOrEqual(OUTLINE_BOX);
		}
	});

	it("fills the box in one direction, and is centred in the other", () => {
		for (const [name, outline] of everyOutline) {
			const { left, right, top, bottom, width, height } = box(
				pieces(outline).flat(),
			);
			expect(Math.max(width, height), name).toBe(OUTLINE_BOX);
			// Rounded to whole numbers, so the two margins can differ by one.
			expect(Math.abs(left - (OUTLINE_BOX - right)), name).toBeLessThanOrEqual(
				1,
			);
			expect(Math.abs(top - (OUTLINE_BOX - bottom)), name).toBeLessThanOrEqual(
				1,
			);
		}
	});
});

describe("outlines: which land is shown is the map's own views", () => {
	/** The box around some land and the country's name, as countryBounds frames it. */
	function boundsOf(feature: MapCountryFeature) {
		let [west, south] = feature.properties.label;
		let [east, north] = feature.properties.label;
		for (const [lng, lat] of landNearName(feature).flatMap(
			([outer]) => outer ?? [],
		)) {
			west = Math.min(west, lng);
			east = Math.max(east, lng);
			south = Math.min(south, lat);
			north = Math.max(north, lat);
		}
		return { west, south, east, north };
	}

	it("shows the land that the country view frames, for every country", () => {
		// countryBounds widens a view narrower than 4°, evenly on both sides.
		const SMALLEST_VIEW = 4;
		for (const feature of features) {
			const { west, south, east, north } = boundsOf(feature);
			const padLng = Math.max(0, SMALLEST_VIEW - (east - west)) / 2;
			const padLat = Math.max(0, SMALLEST_VIEW - (north - south)) / 2;
			expect(countryBounds(feature), feature.properties.iso).toEqual([
				[west - padLng, south - padLat],
				[east + padLng, north + padLat],
			]);
		}
	});

	it("shows each continent inside its view's box", () => {
		for (const continent of continentIds) {
			const [[west, south], [east, north]] = CONTINENT_BOUNDS[continent];
			expect(CONTINENT_FRAMES[continent]).toEqual([west, south, east, north]);
		}
	});

	/** Width over height of some land as the map draws it, in Equal Earth. */
	function shapeOf(feature: MapCountryFeature): number {
		const points = landNearName(feature)
			.flatMap(([outer]) => outer ?? [])
			.map((point) => equalEarth.forward(point) as [number, number]);
		const { width, height } = box(points);
		return width / height;
	}

	function shapeOfOutline(iso: string): number {
		const { width, height } = box(pieces(outlineOf(iso)).flat());
		return width / height;
	}

	it("shows both main islands of New Zealand, and not the Chatham Islands", () => {
		const newZealand = country("NZ");
		const land = landNearName(newZealand);
		// The North Island, the South Island and Stewart Island.
		expect(land).toHaveLength(3);
		// The Chatham Islands are 800 km east, past the 180° line.
		const eastern = Math.max(...land.flat(2).map(([lng]) => lng));
		expect(eastern).toBeLessThan(179);
		expect(
			newZealand.geometry.coordinates.flat(2).some(([lng]) => lng > 182),
		).toBe(true);
		// The outline is that land and nothing else: it has its proportions.
		expect(shapeOfOutline("NZ")).toBeCloseTo(shapeOf(newZealand), 1);
	});

	it("shows Kiribati as the atolls around Tarawa, not the whole Pacific", () => {
		const kiribati = country("KI");
		const land = landNearName(kiribati);
		expect(land.length).toBeGreaterThan(0);
		for (const [lng, lat] of land.flat(2)) {
			expect(Math.abs(lng - 173)).toBeLessThan(2);
			expect(Math.abs(lat - 1.4)).toBeLessThan(2);
		}
		// Kiritimati, the largest atoll, is 3,000 km east and left out.
		expect(land.length).toBeLessThan(kiribati.geometry.coordinates.length);
		expect(shapeOfOutline("KI")).toBeCloseTo(shapeOf(kiribati), 1);
	});

	it("shows a country whose name is on its land as that piece of land", () => {
		// Hawaii and Alaska are pieces of their own; the mainland has the name.
		expect(landNearName(country("US"))).toHaveLength(1);
		expect(shapeOfOutline("US")).toBeCloseTo(shapeOf(country("US")), 1);
	});
});
