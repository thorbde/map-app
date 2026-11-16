import { geoEqualEarthRaw } from "d3-geo";
import { describe, expect, it } from "vitest";
import { equalEarth, equalEarthProjection } from "./equal-earth";

const RADIUS = 6_371_008.8;
const places: [name: string, lng: number, lat: number][] = [
	["the map's centre", 11, 0],
	["Gothenburg", 11.97, 57.71],
	["Nairobi", 36.82, -1.29],
	["Brasília", -47.88, -15.79],
	["Tokyo", 139.69, 35.68],
	["Auckland", 174.76, -36.85],
	["Chukotka, past the 180° line", 185, 66.5],
	["Anchorage", -149.9, 61.22],
	["Cape Horn", -67.27, -55.98],
	["the far north", 20, 89],
];

describe("Equal Earth", () => {
	it("agrees with d3-geo's Equal Earth, centred on 11° E", () => {
		for (const [name, lng, lat] of places) {
			const expected = geoEqualEarthRaw(
				(((((lng - 11 + 180) % 360) + 360) % 360) - 180) * (Math.PI / 180),
				lat * (Math.PI / 180),
			);
			const [x, y] = equalEarth.forward([lng, lat]) as [number, number];
			expect(x / RADIUS, name).toBeCloseTo(expected[0], 9);
			expect(y / RADIUS, name).toBeCloseTo(expected[1], 9);
		}
	});

	it("goes there and back again", () => {
		for (const [name, lng, lat] of places) {
			const back = equalEarth.inverse(equalEarth.forward([lng, lat]));
			expect(back?.[0], name).toBeCloseTo(lng, 6);
			expect(back?.[1], name).toBeCloseTo(lat, 6);
		}
	});

	it("puts the map's edges at 169° W and 191° E, on opposite sides", () => {
		const [west] = equalEarth.forward([-169, 0]) as [number, number];
		const [east] = equalEarth.forward([191, 0]) as [number, number];
		expect(west).toBeLessThan(0);
		expect(east).toBeCloseTo(-west, 3);
		// Just inside either edge stays on its own side.
		expect(equalEarth.forward([-168.9, 60])[0]).toBeLessThan(0);
		expect(equalEarth.forward([190.9, 60])[0]).toBeGreaterThan(0);
	});

	it("keeps Russia together: Chukotka is next to Kamchatka, not across the map", () => {
		const [kamchatka] = equalEarth.forward([160, 60]) as [number, number];
		const [chukotka] = equalEarth.forward([185, 66]) as [number, number];
		expect(chukotka).toBeGreaterThan(kamchatka);
	});

	it("has no answer outside the world", () => {
		const width = equalEarthProjection.tileMatrixSet.extentAtZoom0;
		expect(equalEarth.inverse([0, width / 2])).toBeNull(); // above the pole
		expect(equalEarth.inverse([width * 0.6, 0])).toBeNull(); // past the edge
	});

	it("lays MapLibre's square over the whole world, centred on it", () => {
		const { origin, extentAtZoom0 } = equalEarthProjection.tileMatrixSet;
		expect(origin).toEqual([-extentAtZoom0 / 2, extentAtZoom0 / 2]);
		const [east] = equalEarth.forward([191, 0]) as [number, number];
		expect(extentAtZoom0).toBeCloseTo(2 * east, 3);
	});
});
