import { describe, expect, it } from "vitest";
import { countries } from "../countries";
// As text: the file is 6.5 MB, and handing that to the test runtime as a module
// of JavaScript objects runs it out of memory.
import worldText from "./geometry/world.json?raw";
import type { MapCountryFeature, MapFile, MapNeutralFeature } from "./map-file";

// These tests read the committed file that scripts/build-maps.ts generates.
const file = JSON.parse(worldText) as MapFile;

type Point = [lng: number, lat: number];
type Geometry = MapCountryFeature["geometry"];

const countryFeatures = file.features.filter(
	(feature): feature is MapCountryFeature => "iso" in feature.properties,
);
const neutralFeatures = file.features.filter(
	(feature): feature is MapNeutralFeature => "neutral" in feature.properties,
);

function country(iso: string): MapCountryFeature | undefined {
	return countryFeatures.find((feature) => feature.properties.iso === iso);
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

/** Is the point on this land? Inside a polygon's outer ring, and in none of its holes. */
function contains(geometry: Geometry | undefined, point: Point): boolean {
	return (geometry?.coordinates ?? []).some((polygon) =>
		polygon.every((ring, i) => ringContains(ring, point) === (i === 0)),
	);
}

/** How far a point is from the nearest point of a shape's outline, in kilometres. */
function kmToLand(geometry: Geometry, [lng, lat]: Point): number {
	const radians = Math.PI / 180;
	let nearest = Number.POSITIVE_INFINITY;
	for (const [x, y] of geometry.coordinates.flat(2)) {
		const dLat = (y - lat) * radians;
		const dLng = (x - lng) * radians * Math.cos(lat * radians);
		nearest = Math.min(nearest, 6371 * Math.hypot(dLat, dLng));
	}
	return nearest;
}

/** Which countries the point is in, and "neutral" for neutral land. */
function at(point: Point): string[] {
	const found = countryFeatures
		.filter((feature) => contains(feature.geometry, point))
		.map((feature) => feature.properties.iso);
	if (neutralFeatures.some((feature) => contains(feature.geometry, point))) {
		found.push("neutral");
	}
	return found;
}

describe("map geometry: every country is there", () => {
	it("has every country in the list, each with a shape, and one piece of neutral land", () => {
		expect(countryFeatures.map((feature) => feature.properties.iso)).toEqual(
			countries.map((each) => each.iso).sort(),
		);
		for (const feature of countryFeatures) {
			expect(
				feature.geometry.coordinates.length,
				feature.properties.iso,
			).toBeGreaterThan(0);
		}
		expect(neutralFeatures).toHaveLength(1);
	});

	it("puts every label point on its country, or within 150 km of its land", () => {
		// The label points are Natural Earth's. For a country of islands it puts
		// the name in the sea between them, as an atlas does (ADR 0020).
		const atSea: string[] = [];
		for (const feature of countryFeatures) {
			const { iso, label } = feature.properties;
			if (contains(feature.geometry, label)) continue;
			atSea.push(iso);
			expect(kmToLand(feature.geometry, label), iso).toBeLessThan(150);
		}
		// Antigua & Barbuda, Equatorial Guinea, Kiribati (hand-set on Tarawa, which
		// is narrower than the file's detail), New Zealand, São Tomé & Príncipe,
		// Trinidad & Tobago, St Vincent & the Grenadines. And the Vatican: its
		// label is where the Vatican is, and its shape, from the coarser data, is
		// drawn 1.3 km to the west.
		expect(atSea).toEqual(["AG", "GQ", "KI", "NZ", "ST", "TT", "VA", "VC"]);
	});

	it("carries Natural Earth's label zooms and rank for every country", () => {
		for (const feature of countryFeatures) {
			const { iso, labelMinZoom, labelMaxZoom, labelRank } = feature.properties;
			expect(labelMinZoom, iso).toBeGreaterThanOrEqual(1);
			expect(labelMaxZoom, iso).toBeGreaterThan(labelMinZoom);
			expect(labelRank, iso).toBeGreaterThanOrEqual(1);
			expect(labelRank, iso).toBeLessThanOrEqual(10);
		}
		// Big countries are named first as the viewer zooms in.
		const minZoom = (iso: string) => country(iso)?.properties.labelMinZoom;
		expect(minZoom("RU")).toBe(1.7);
		expect(minZoom("BR")).toBe(1.7);
		expect(minZoom("DK")).toBe(3);
		expect(minZoom("LU")).toBe(5.7);
		expect(country("RU")?.properties.labelRank).toBe(2);
		expect(country("LU")?.properties.labelRank).toBe(6);
	});

	it("labels Kiribati on Tarawa, its capital", () => {
		expect(country("KI")?.properties.label).toEqual([173, 1.4]);
	});

	it("has enough detail to look at a country: Denmark's coast has over a thousand points", () => {
		expect(country("DK")?.geometry.coordinates.flat(2).length).toBeGreaterThan(
			1000,
		);
	});
});

describe("map geometry: the file is well formed", () => {
	it("keeps every coordinate between the map's edges", () => {
		// The map's edge is 169° W, so longitudes run from -169 to 191 (ADR 0020).
		for (const feature of file.features) {
			for (const [lng, lat] of feature.geometry.coordinates.flat(2)) {
				if (!(lng >= -169 && lng <= 191 && lat >= -90 && lat <= 90)) {
					expect.fail(`A point outside the map: ${lng}, ${lat}`);
				}
			}
		}
	});

	it("closes every ring, and no ring jumps across the map", () => {
		for (const feature of file.features) {
			for (const ring of feature.geometry.coordinates.flat()) {
				expect(ring.length).toBeGreaterThanOrEqual(4);
				expect(ring[0]).toEqual(ring[ring.length - 1]);
				for (let i = 1; i < ring.length; i++) {
					const step = Math.abs(
						(ring[i] as Point)[0] - (ring[i - 1] as Point)[0],
					);
					if (step >= 180) expect.fail("A ring jumps across the map");
				}
			}
		}
	});

	it("has no Antarctica", () => {
		expect(at([0, -80])).toEqual([]);
		expect(at([100, -75])).toEqual([]);
	});

	it("stays under 2.5 MB gzipped", async () => {
		const stream = new Blob([worldText])
			.stream()
			.pipeThrough(new CompressionStream("gzip"));
		const size = (await new Response(stream).arrayBuffer()).byteLength;
		expect(size).toBeLessThan(2_500_000);
	});
});

// One test per border choice in ADR 0020. Each checks a place on the ground.
describe("map geometry: border choices (ADR 0020)", () => {
	it("draws Kosovo as its own country, separate from Serbia", () => {
		expect(at([21.17, 42.66])).toEqual(["XK"]); // Pristina
		expect(at([20.46, 44.3])).toEqual(["RS"]); // south of Belgrade
	});

	it("draws Taiwan as its own country", () => {
		expect(at([121, 24])).toEqual(["TW"]);
	});

	it("draws Somaliland as part of Somalia", () => {
		expect(at([44.06, 9.56])).toEqual(["SO"]); // Hargeisa
	});

	it("draws Crimea as part of Ukraine", () => {
		expect(at([34.1, 44.95])).toEqual(["UA"]); // Simferopol
	});

	it("draws Western Sahara as its own country, and Morocco north of its border near 27°40′ N", () => {
		expect(at([-13.0, 27.0])).toEqual(["EH"]); // near Laayoune
		expect(at([-15.5, 23.8])).toEqual(["EH"]); // near Dakhla
		expect(at([-9.5, 26.5])).toEqual(["EH"]); // east of the sand wall
		expect(at([-10.0, 28.5])).toEqual(["MA"]); // near Tan-Tan
		expect(at([-6.5, 33.5])).toEqual(["MA"]); // near Rabat
		const morocco = country("MA")?.geometry.coordinates.flat(2) ?? [];
		const southernmost = Math.min(...morocco.map(([, lat]) => lat));
		// Natural Earth's line. It runs about 600 m south of the parallel itself.
		expect(southernmost).toBeCloseTo(27.661, 2);
		// The mainland is one shape: the sand wall that splits it in the source
		// data is gone. (The rest are coastal islets.)
		const mainland = country("EH")?.geometry.coordinates.filter((polygon) =>
			ringContains(polygon[0] as Point[], [-13.0, 25.0]),
		);
		expect(mainland).toHaveLength(1);
		expect(contains(country("EH")?.geometry, [-9.5, 26.5])).toBe(true);
		expect(
			ringContains((mainland?.[0]?.[0] ?? []) as Point[], [-9.5, 26.5]),
		).toBe(true);
	});

	it("draws the Cook Islands and Niue as countries, where they are", () => {
		expect(at([-159.78, -21.23])).toEqual(["CK"]); // Rarotonga
		// Niue is at 169°52′ W, just west of the map's edge: longitude 190 here.
		expect(at([190.13, -19.05])).toEqual(["NU"]);
		// The Cook Islands are east of the edge, so on the far left of the map.
		for (const [lng] of country("CK")?.geometry.coordinates.flat(2) ?? []) {
			expect(lng).toBeLessThan(-155);
		}
	});

	it("keeps countries that lie inside another: each is a hole in its neighbour", () => {
		expect(at([28.2, -29.5])).toEqual(["LS"]); // Lesotho, in South Africa
		expect(at([12.45, 43.94])).toEqual(["SM"]); // San Marino, in Italy
		expect(at([12.434, 41.902])).toEqual(["VA"]); // the Vatican, in Italy
	});

	it("draws Åland as part of Finland", () => {
		expect(at([19.95, 60.25])).toEqual(["FI"]);
	});

	it("draws Baikonur as part of Kazakhstan", () => {
		expect(at([63.3, 45.9])).toEqual(["KZ"]);
	});

	it("draws France's overseas departments as neutral land", () => {
		expect(at([-53, 4])).toEqual(["neutral"]); // French Guiana
		expect(at([55.5, -21.1])).toEqual(["neutral"]); // Réunion
		expect(at([-61.0, 14.65])).toEqual(["neutral"]); // Martinique
		for (const [lng, lat] of country("FR")?.geometry.coordinates.flat(2) ??
			[]) {
			expect(lng > -10 && lng < 15 && lat > 40 && lat < 52).toBe(true);
		}
		expect(at([9.1, 42.2])).toEqual(["FR"]); // Corsica stays French
	});

	it("draws the Caribbean Netherlands as neutral land", () => {
		expect(at([-68.3, 12.2])).toEqual(["neutral"]); // Bonaire
		for (const [lng] of country("NL")?.geometry.coordinates.flat(2) ?? []) {
			expect(lng).toBeGreaterThan(0);
		}
	});

	it("draws Northern Cyprus as neutral land", () => {
		expect(at([33.6, 35.3])).toEqual(["neutral"]);
		expect(at([33.0, 34.8])).toEqual(["CY"]);
	});

	it("draws Hong Kong and Macao as neutral land (undecided)", () => {
		expect(at([114.15, 22.4])).toEqual(["neutral"]);
	});

	it("draws Greenland and Puerto Rico as neutral land", () => {
		expect(at([-42, 72])).toEqual(["neutral"]);
		expect(at([-66.4, 18.2])).toEqual(["neutral"]);
	});

	it("keeps distant parts that are fully part of their country", () => {
		expect(at([-150, 65])).toEqual(["US"]); // Alaska
		expect(at([-155.5, 19.6])).toEqual(["US"]); // Hawaii
		expect(at([18, 79])).toEqual(["NO"]); // Svalbard
		expect(at([-16.5, 28.3])).toEqual(["ES"]); // Tenerife
	});

	it("draws the contested areas listed in ADR 0020 as the source data has them", () => {
		// Not endorsements: these pin down what the map shows today, so that a
		// change in the source data can't alter a border without a failing test.
		expect(at([35.8, 33.0])).toEqual(["IL"]); // Golan Heights
		expect(at([35.25, 32.0])).toEqual(["PS"]); // West Bank
		expect(at([74.8, 34.1])).toEqual(["IN"]); // Kashmir valley
		expect(at([74.5, 35.9])).toEqual(["PK"]); // Gilgit
		expect(at([79.5, 35.0])).toEqual(["CN"]); // Aksai Chin
		expect(at([94.5, 28.0])).toEqual(["IN"]); // Arunachal Pradesh
		expect(at([41.0, 43.1])).toEqual(["GE"]); // Abkhazia
		expect(at([44.0, 42.3])).toEqual(["GE"]); // South Ossetia
		expect(at([46.75, 39.8])).toEqual(["AZ"]); // Nagorno-Karabakh
		expect(at([29.5, 46.9])).toEqual(["MD"]); // Transnistria
		expect(at([37.8, 48.0])).toEqual(["UA"]); // Donetsk
		expect(at([36.0, 22.5])).toEqual(["EG"]); // Hala'ib triangle
		expect(at([35.3, 4.8])).toEqual(["KE"]); // Ilemi triangle
		expect(at([28.6, 9.6])).toEqual(["SD"]); // Abyei
		expect(at([147.9, 45.0])).toEqual(["RU"]); // Kuril Islands (Iturup)
		// Entries of their own in Natural Earth 5, claimed by no one or by two.
		expect(at([33.4, 21.9])).toEqual(["neutral"]); // Bir Tawil
		expect(at([-73.37, -49.62])).toEqual(["neutral"]); // Southern Patagonian Ice Field
	});

	it("keeps Russia in one piece across the 180° line, labelled in European Russia", () => {
		// Chukotka is at 175° W: longitude 185 on this map.
		expect(at([185, 66.5])).toEqual(["RU"]);
		const label = country("RU")?.properties.label as Point;
		expect(label[0]).toBeLessThan(60); // west of the Urals
		expect(contains(country("RU")?.geometry, label)).toBe(true);
	});
});
