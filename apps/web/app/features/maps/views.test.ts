import { describe, expect, it } from "vitest";
import { countries } from "../countries";
import { equalEarth, equalEarthProjection } from "./equal-earth";
import world from "./geometry/world.json";
import type { MapCountryFeature, MapFile } from "./map-file";
import {
	type Bounds,
	CONTINENT_BOUNDS,
	cameraFor,
	countryBounds,
	WORLD_BOUNDS,
} from "./views";

const features = (world as unknown as MapFile).features.filter(
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

	it("shows every country's label point in its continent's view", () => {
		for (const { iso, continent } of countries) {
			const [[west, south], [east, north]] = CONTINENT_BOUNDS[continent];
			const [lng, lat] = country(iso).properties.label;
			expect(lng >= west && lng <= east, iso).toBe(true);
			expect(lat >= south && lat <= north, iso).toBe(true);
		}
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

	it("gives a country without a shape a view around its label point", () => {
		const malta = country("MT");
		expect(malta.geometry).toBeNull();
		const [[west, south], [east, north]] = countryBounds(malta);
		expect(east - west).toBeCloseTo(4, 5);
		expect(north - south).toBeCloseTo(4, 5);
		const [lng, lat] = malta.properties.label;
		expect((west + east) / 2).toBeCloseTo(lng, 5);
		expect((south + north) / 2).toBeCloseTo(lat, 5);
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

	it("zooms in further for a smaller viewport's worth of land", () => {
		const europe = cameraFor(CONTINENT_BOUNDS.europe, viewport);
		const world = cameraFor(WORLD_BOUNDS, viewport);
		expect(europe.zoom).toBeGreaterThan(world.zoom + 1);
	});
});
