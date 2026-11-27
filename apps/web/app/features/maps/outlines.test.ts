import { describe, expect, it } from "vitest";
import { type Continent, countries } from "../countries";
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
import {
	CONTINENT_FRAMES,
	landInReach,
	landNearName,
	outlineCentre,
} from "./outline-land";
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

describe("outlines: which land is shown", () => {
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

	it("starts from the land that the country view frames, for every country", () => {
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

	/**
	 * A place in the Lambert azimuthal equal-area projection centred on
	 * [lng0, lat0], on a sphere: how the build draws each outline (ADR 0020).
	 * y grows northward here, so only proportions are compared.
	 */
	function lambert(
		[lng, lat]: [number, number],
		[lng0, lat0]: [number, number],
	): [number, number] {
		const rad = Math.PI / 180;
		const [l, p, p0] = [(lng - lng0) * rad, lat * rad, lat0 * rad];
		const k = Math.sqrt(
			2 /
				(1 +
					Math.sin(p0) * Math.sin(p) +
					Math.cos(p0) * Math.cos(p) * Math.cos(l)),
		);
		return [
			k * Math.cos(p) * Math.sin(l),
			k *
				(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
		];
	}

	/** Width over height of the land an outline shows, in the outline's own projection. */
	function shapeOf(feature: MapCountryFeature): number {
		const land = landInReach(feature);
		const centre = outlineCentre(land);
		const points = land
			.flatMap(([outer]) => outer ?? [])
			.map((point) => lambert(point, centre));
		const { width, height } = box(points);
		return width / height;
	}

	/**
	 * The outline has the proportions of the land it shows, to within a tenth:
	 * islets too small to draw are in the land and not in the outline. With
	 * Alaska, or the Chatham Islands, it would be out by far more.
	 */
	function expectSameShape(iso: string) {
		const ratio = shapeOfOutline(iso) / shapeOf(country(iso));
		expect(ratio, iso).toBeGreaterThan(0.9);
		expect(ratio, iso).toBeLessThan(1.1);
	}

	function shapeOfOutline(iso: string): number {
		const { width, height } = box(pieces(outlineOf(iso)).flat());
		return width / height;
	}

	/** Is this place on the land the country's outline shows? */
	function shows(iso: string, [lng, lat]: [number, number]): boolean {
		return landInReach(country(iso)).some(([outer]) => {
			let inside = false;
			const ring = outer ?? [];
			for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
				const [x0, y0] = ring[i] as [number, number];
				const [x1, y1] = ring[j] as [number, number];
				if (
					y0 > lat !== y1 > lat &&
					lng < ((x1 - x0) * (lat - y0)) / (y1 - y0) + x0
				) {
					inside = !inside;
				}
			}
			return inside;
		});
	}

	it("always shows the land the country view frames", () => {
		for (const feature of features) {
			const land = landInReach(feature);
			for (const piece of landNearName(feature)) {
				expect(land.includes(piece), feature.properties.iso).toBe(true);
			}
		}
	});

	it("keeps islands that belong together together", () => {
		// Sumatra, Java, Borneo and Papua.
		for (const place of [
			[101.5, 0],
			[110, -7.3],
			[114, 0],
			[139, -4],
		]) {
			expect(shows("ID", place as [number, number]), `${place}`).toBe(true);
		}
		expect(shows("DK", [9.2, 56]), "Jutland").toBe(true);
		expect(shows("DK", [11.8, 55.5]), "Zealand").toBe(true);
		expect(shows("IT", [14.2, 37.6]), "Sicily").toBe(true);
		expect(shows("IT", [9, 40]), "Sardinia").toBe(true);
		expect(shows("JP", [142.8, 43.4]), "Hokkaido").toBe(true);
		expect(shows("GB", [-6.7, 54.6]), "Northern Ireland").toBe(true);
		expect(shows("ES", [3, 39.6]), "Mallorca").toBe(true);
	});

	it("leaves out land far off on its own", () => {
		expect(shows("US", [-98, 39]), "Kansas").toBe(true);
		expect(shows("US", [-150, 65]), "Alaska").toBe(false);
		expect(shows("US", [-155.5, 19.6]), "Hawaii").toBe(false);
		expect(shows("NO", [16, 78.5]), "Svalbard").toBe(false);
		// Corsica is more than 150 km from the mainland: just out of reach (ADR 0020).
		expect(shows("FR", [9.1, 42.2]), "Corsica").toBe(false);
		expect(shows("ES", [-16.6, 28.3]), "Tenerife").toBe(false);
		expect(shows("PT", [-25.5, 37.8]), "São Miguel, in the Azores").toBe(false);
		for (const iso of ["US", "NO", "ES", "PT", "ID"]) expectSameShape(iso);
	});

	it("shows the main islands of New Zealand, and not the Chatham Islands", () => {
		expect(shows("NZ", [175.5, -39]), "the North Island").toBe(true);
		expect(shows("NZ", [170.5, -44]), "the South Island").toBe(true);
		// The Chatham Islands are 800 km east, past the 180° line.
		const eastern = Math.max(
			...landInReach(country("NZ"))
				.flat(2)
				.map(([lng]) => lng),
		);
		expect(eastern).toBeLessThan(179);
		expect(
			country("NZ")
				.geometry.coordinates.flat(2)
				.some(([lng]) => lng > 182),
		).toBe(true);
		expectSameShape("NZ");
	});

	it("shows Kiribati as the Gilbert Islands around Tarawa, not the whole Pacific", () => {
		const kiribati = country("KI");
		const land = landInReach(kiribati);
		expect(land.length).toBeGreaterThan(0);
		// The Gilbert Islands run 800 km along 173° to 177° E. Kiritimati,
		// the largest atoll, is 3,000 km east and left out.
		for (const [lng] of land.flat(2)) {
			expect(lng).toBeGreaterThan(171);
			expect(lng).toBeLessThan(178);
		}
		expect(land.length).toBeLessThan(kiribati.geometry.coordinates.length);
		expectSameShape("KI");
	});
});
