import { describe, expect, it } from "vitest";
import { type Continent, countries } from "../countries";
import { equalEarth, equalEarthProjection } from "./equal-earth";
// As text: see geometry.test.ts.
import worldText from "./geometry/world.json?raw";
import type { MapCountryFeature, MapFile } from "./map-file";
import {
	type Bounds,
	CONTINENT_BOUNDS,
	cameraFor,
	countryBounds,
	viewBounds,
	WORLD_BOUNDS,
} from "./views";

const features = (JSON.parse(worldText) as MapFile).features.filter(
	(feature): feature is MapCountryFeature => "iso" in feature.properties,
);
const byIso = new Map(
	features.map((feature) => [feature.properties.iso, feature]),
);

function country(iso: string): MapCountryFeature {
	const feature = byIso.get(iso);
	if (!feature) throw new Error(`No ${iso} in the world file`);
	return feature;
}

describe("map views", () => {
	it("shows every country's label point in the world view", () => {
		const [[west, south], [east, north]] = WORLD_BOUNDS;
		for (const { properties } of features) {
			const [lng, lat] = properties.label;
			expect(lng >= west && lng <= east, properties.iso).toBe(true);
			expect(lat >= south && lat <= north, properties.iso).toBe(true);
		}
	});

	it("shows every country's label point in its continent's view, but for the Cook Islands", () => {
		// The Cook Islands are at the map's left edge and the rest of Oceania is
		// at its right, so no view of Oceania holds both: they are reached by
		// panning (Thor, 2026-11-17). Any other country outside its view fails.
		const outside: string[] = [];
		for (const { iso, continent } of countries) {
			const [[west, south], [east, north]] = CONTINENT_BOUNDS[continent];
			const [lng, lat] = country(iso).properties.label;
			const inside = lng >= west && lng <= east && lat >= south && lat <= north;
			if (!inside) outside.push(iso);
		}
		expect(outside).toEqual(["CK"]);
	});

	it("frames a country around its largest piece of land", () => {
		// Sweden, roughly 11° to 24° E and 55° to 69° N.
		const [[west, south], [east, north]] = countryBounds(country("SE"));
		expect(west).toBeGreaterThan(10);
		expect(east).toBeLessThan(25);
		expect(south).toBeGreaterThan(54);
		expect(north).toBeLessThan(70);
	});

	it("frames the United States around the mainland, not Alaska and Hawaii too", () => {
		const [[west], [east]] = countryBounds(country("US"));
		expect(west).toBeGreaterThan(-130);
		expect(east).toBeLessThan(-60);
	});

	it("gives a very small country a view a few degrees across, around it", () => {
		const malta = country("MT");
		const [[west, south], [east, north]] = countryBounds(malta);
		expect(east - west).toBeCloseTo(4, 5);
		expect(north - south).toBeCloseTo(4, 5);
		const [lng, lat] = malta.properties.label;
		expect(Math.abs((west + east) / 2 - lng)).toBeLessThan(0.2);
		expect(Math.abs((south + north) / 2 - lat)).toBeLessThan(0.2);
	});

	it("frames both main islands of New Zealand, whose name is in the strait between them", () => {
		const [[west, south], [east, north]] = countryBounds(country("NZ"));
		// From Fiordland in the south-west to East Cape and Cape Reinga in the north.
		expect(west).toBeLessThan(167);
		expect(south).toBeLessThan(-46);
		expect(east).toBeGreaterThan(178);
		expect(north).toBeGreaterThan(-35);
	});

	it("frames the Vatican's land together with its name, which is beside it", () => {
		const vatican = country("VA");
		const [[west, south], [east, north]] = countryBounds(vatican);
		for (const [lng, lat] of vatican.geometry.coordinates[0]?.[0] ?? []) {
			expect(lng).toBeGreaterThan(west);
			expect(lng).toBeLessThan(east);
			expect(lat).toBeGreaterThan(south);
			expect(lat).toBeLessThan(north);
		}
	});

	it("frames Kiribati around Tarawa, not the whole Pacific", () => {
		const [[west], [east]] = countryBounds(country("KI"));
		expect(east - west).toBeLessThan(6);
	});

	it("always contains the label point", () => {
		for (const feature of features) {
			const [[west, south], [east, north]] = countryBounds(feature);
			const [lng, lat] = feature.properties.label;
			const inside = lng >= west && lng <= east && lat >= south && lat <= north;
			expect(inside, feature.properties.iso).toBe(true);
		}
	});
});

describe("which box a view shows", () => {
	it("shows the whole world for the world view", () => {
		expect(viewBounds({ kind: "world" }, features)).toBe(WORLD_BOUNDS);
	});

	it("shows each continent's own box", () => {
		for (const continent of Object.keys(CONTINENT_BOUNDS) as Continent[]) {
			expect(viewBounds({ kind: "continent", continent }, features)).toBe(
				CONTINENT_BOUNDS[continent],
			);
		}
	});

	it("shows a country's own box", () => {
		expect(viewBounds({ kind: "country", iso: "KE" }, features)).toEqual(
			countryBounds(country("KE")),
		);
	});

	it("shows the world for a country that isn't on the map", () => {
		expect(viewBounds({ kind: "country", iso: "XX" }, features)).toBe(
			WORLD_BOUNDS,
		);
	});
});

describe("the camera", () => {
	const viewport = { width: 1200, height: 700 };

	/** Where a place lands on screen, in pixels from the viewport's top-left corner. */
	function onScreen(
		camera: ReturnType<typeof cameraFor>,
		[lng, lat]: [number, number],
	): [x: number, y: number] {
		const scale =
			(512 * 2 ** camera.zoom) /
			equalEarthProjection.tileMatrixSet.extentAtZoom0;
		const [cx = 0, cy = 0] = equalEarth.forward(camera.center);
		const [x = 0, y = 0] = equalEarth.forward([lng, lat]);
		return [
			viewport.width / 2 + (x - cx) * scale,
			viewport.height / 2 - (y - cy) * scale,
		];
	}

	function expectVisible(bounds: Bounds, name: string) {
		const camera = cameraFor(bounds, viewport);
		const [[west, south], [east, north]] = bounds;
		// The corners, and the middles of the edges, where Equal Earth bulges.
		for (const lng of [west, (west + east) / 2, east]) {
			for (const lat of [south, (south + north) / 2, north]) {
				const [x, y] = onScreen(camera, [lng, lat]);
				expect(x >= 0 && x <= viewport.width, `${name}: ${lng}, ${lat}`).toBe(
					true,
				);
				expect(y >= 0 && y <= viewport.height, `${name}: ${lng}, ${lat}`).toBe(
					true,
				);
			}
		}
	}

	it("fits the whole world in the viewport, edge to edge", () => {
		expectVisible(WORLD_BOUNDS, "world");
		const camera = cameraFor(WORLD_BOUNDS, viewport);
		// The equator spans the map: 169° W near the left edge, 191° E near the right.
		expect(onScreen(camera, [-169, 0])[0]).toBeLessThan(40);
		expect(onScreen(camera, [191, 0])[0]).toBeGreaterThan(viewport.width - 40);
		expect(camera.center[0]).toBeCloseTo(11, 5);
	});

	it("fits every continent in the viewport", () => {
		for (const [continent, bounds] of Object.entries(CONTINENT_BOUNDS)) {
			expectVisible(bounds, continent);
		}
	});

	it("fills the viewport in at least one direction", () => {
		for (const bounds of Object.values(CONTINENT_BOUNDS)) {
			const camera = cameraFor(bounds, viewport, 0);
			const [[west, south], [east, north]] = bounds;
			const xs: number[] = [];
			const ys: number[] = [];
			for (let i = 0; i <= 16; i++) {
				const lng = west + ((east - west) * i) / 16;
				const lat = south + ((north - south) * i) / 16;
				for (const point of [
					[lng, south],
					[lng, north],
					[west, lat],
					[east, lat],
				] as [number, number][]) {
					const [x, y] = onScreen(camera, point);
					xs.push(x);
					ys.push(y);
				}
			}
			const width = Math.max(...xs) - Math.min(...xs);
			const height = Math.max(...ys) - Math.min(...ys);
			const fillsWidth = Math.abs(width - viewport.width) < 1;
			const fillsHeight = Math.abs(height - viewport.height) < 1;
			expect(fillsWidth || fillsHeight).toBe(true);
		}
	});

	describe("when a panel covers part of the map", () => {
		const PANEL = 416; // the shell's panel and the gaps beside it
		const covered = { left: PANEL, top: 56 };

		it("fits every view in the part that isn't covered", () => {
			// MapLibre puts the camera's centre in the middle of the uncovered
			// part, so that is where the box must fit.
			const free = {
				width: viewport.width - PANEL,
				height: viewport.height - 56,
			};
			for (const [name, bounds] of Object.entries({
				world: WORLD_BOUNDS,
				...CONTINENT_BOUNDS,
				kenya: countryBounds(country("KE")),
			})) {
				const camera = cameraFor(bounds, viewport, 24, covered);
				const [[west, south], [east, north]] = bounds;
				for (const lng of [west, (west + east) / 2, east]) {
					for (const lat of [south, (south + north) / 2, north]) {
						const [x, y] = onScreen(camera, [lng, lat]);
						// onScreen measures from the middle of the whole viewport.
						const fromMiddleX = Math.abs(x - viewport.width / 2);
						const fromMiddleY = Math.abs(y - viewport.height / 2);
						expect(fromMiddleX, `${name}: ${lng}, ${lat}`).toBeLessThanOrEqual(
							free.width / 2,
						);
						expect(fromMiddleY, `${name}: ${lng}, ${lat}`).toBeLessThanOrEqual(
							free.height / 2,
						);
					}
				}
			}
		});

		it("is the same as a viewport that much smaller", () => {
			const padded = cameraFor(CONTINENT_BOUNDS.africa, viewport, 24, covered);
			const smaller = cameraFor(CONTINENT_BOUNDS.africa, {
				width: viewport.width - PANEL,
				height: viewport.height - 56,
			});
			expect(padded.zoom).toBeCloseTo(smaller.zoom, 10);
			expect(padded.center).toEqual(smaller.center);
		});

		it("zooms out, and keeps the same centre, compared with nothing covered", () => {
			const padded = cameraFor(CONTINENT_BOUNDS.europe, viewport, 24, covered);
			const open = cameraFor(CONTINENT_BOUNDS.europe, viewport);
			expect(padded.zoom).toBeLessThan(open.zoom);
			expect(padded.center).toEqual(open.center);
		});

		it("covers nothing unless told to", () => {
			expect(cameraFor(WORLD_BOUNDS, viewport, 24, {})).toEqual(
				cameraFor(WORLD_BOUNDS, viewport),
			);
		});
	});

	it("zooms in further for a smaller viewport's worth of land", () => {
		const europe = cameraFor(CONTINENT_BOUNDS.europe, viewport);
		const world = cameraFor(WORLD_BOUNDS, viewport);
		expect(europe.zoom).toBeGreaterThan(world.zoom + 1);
	});
});
