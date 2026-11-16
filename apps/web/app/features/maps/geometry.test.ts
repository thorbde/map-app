import { describe, expect, it } from "vitest";
import { type Continent, countries } from "../countries";
import africa from "./geometry/africa.json";
import asia from "./geometry/asia.json";
import europe from "./geometry/europe.json";
import northAmerica from "./geometry/north-america.json";
import oceania from "./geometry/oceania.json";
import southAmerica from "./geometry/south-america.json";
import world from "./geometry/world.json";
import type { MapCountryFeature, MapFile, MapNeutralFeature } from "./map-file";

// These tests read the committed files that scripts/build-maps.ts generates.
// JSON imports lose the tuple and literal types, hence the casts.
const worldFile = world as unknown as MapFile;
const continentFiles: Record<Continent, MapFile> = {
	africa: africa as unknown as MapFile,
	asia: asia as unknown as MapFile,
	europe: europe as unknown as MapFile,
	"north-america": northAmerica as unknown as MapFile,
	oceania: oceania as unknown as MapFile,
	"south-america": southAmerica as unknown as MapFile,
};
const allFiles: [string, MapFile][] = [
	["world", worldFile],
	...Object.entries(continentFiles),
];

type Point = [lng: number, lat: number];
type Geometry = NonNullable<MapCountryFeature["geometry"]>;

function countriesIn(file: MapFile): MapCountryFeature[] {
	return file.features.filter(
		(feature): feature is MapCountryFeature => "iso" in feature.properties,
	);
}

function country(file: MapFile, iso: string): MapCountryFeature | undefined {
	return countriesIn(file).find((feature) => feature.properties.iso === iso);
}

/** All the neutral land in a file, as one geometry. */
function neutralOf(file: MapFile): Geometry {
	const neutral = file.features.filter(
		(feature): feature is MapNeutralFeature => "neutral" in feature.properties,
	);
	return {
		type: "MultiPolygon",
		coordinates: neutral.flatMap((feature) => feature.geometry.coordinates),
	};
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
function contains(
	geometry: Geometry | null | undefined,
	point: Point,
): boolean {
	return (geometry?.coordinates ?? []).some((polygon) =>
		polygon.every((ring, i) => ringContains(ring, point) === (i === 0)),
	);
}

/** Which countries in the file the point is in, and "neutral" for neutral land. */
function at(file: MapFile, point: Point): string[] {
	const found = countriesIn(file)
		.filter((feature) => contains(feature.geometry, point))
		.map((feature) => feature.properties.iso);
	if (contains(neutralOf(file), point)) found.push("neutral");
	return found;
}

async function gzippedSize(file: MapFile): Promise<number> {
	// The same bytes the build script writes: JSON on one line, then a newline.
	const stream = new Blob([`${JSON.stringify(file)}\n`])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	return (await new Response(stream).arrayBuffer()).byteLength;
}

describe("map geometry: every country is there", () => {
	it("has all 197 countries in the world file, each with a shape or a marker", () => {
		const isos = countriesIn(worldFile).map(
			(feature) => feature.properties.iso,
		);
		expect(isos).toEqual(countries.map((each) => each.iso).sort());
		for (const feature of countriesIn(worldFile)) {
			const drawn =
				feature.geometry !== null || feature.properties.marker === true;
			expect(drawn, feature.properties.iso).toBe(true);
		}
	});

	it("has every country in its own continent's file, and in no other", () => {
		for (const [continent, file] of Object.entries(continentFiles)) {
			const expected = countries
				.filter((each) => each.continent === continent)
				.map((each) => each.iso)
				.sort();
			const isos = countriesIn(file).map((feature) => feature.properties.iso);
			expect(isos, continent).toEqual(expected);
		}
	});

	it("marks every country without a shape as a marker", () => {
		for (const [name, file] of allFiles) {
			for (const feature of countriesIn(file)) {
				if (feature.geometry === null) {
					expect(
						feature.properties.marker,
						`${feature.properties.iso} in ${name}`,
					).toBe(true);
				}
			}
		}
	});

	it("gives every country but the very smallest a shape in its continent's file", () => {
		const withoutShape = Object.values(continentFiles)
			.flatMap(countriesIn)
			.filter((feature) => feature.geometry === null)
			.map((feature) => feature.properties.iso)
			.sort();
		// The Vatican is smaller than the files' precision, and the 50m source
		// data has no Tuvalu.
		expect(withoutShape).toEqual(["TV", "VA"]);
	});

	it("marks Africa's small island states as markers", () => {
		for (const iso of ["CV", "ST", "KM", "MU", "SC"]) {
			expect(country(continentFiles.africa, iso)?.properties.marker, iso).toBe(
				true,
			);
			expect(country(worldFile, iso)?.properties.marker, iso).toBe(true);
		}
	});

	it("doesn't mark large countries", () => {
		for (const iso of ["SE", "KE", "BR", "JP", "NZ", "RU"]) {
			expect(country(worldFile, iso)?.properties.marker, iso).toBeUndefined();
		}
	});

	it("uses the same label point in the world file and the continent's file", () => {
		for (const { iso, continent } of countries) {
			const label = country(continentFiles[continent], iso)?.properties.label;
			expect(label, iso).toEqual(country(worldFile, iso)?.properties.label);
		}
	});

	it("puts every label point inside its country", () => {
		// Two are hand-set (build-maps.ts): Kiribati's is on Tarawa, which is too
		// small to have a shape, and Russia's is checked in its own test below.
		for (const { iso, continent } of countries) {
			const feature = country(continentFiles[continent], iso);
			if (!feature?.geometry || iso === "KI") continue;
			expect(contains(feature.geometry, feature.properties.label), iso).toBe(
				true,
			);
		}
	});
});

describe("map geometry: the files are well formed", () => {
	it("keeps every coordinate between the map's edges", () => {
		// The map's edge is 169° W, so longitudes run from -169 to 191 (ADR 0020).
		for (const [name, file] of allFiles) {
			for (const feature of file.features) {
				for (const [lng, lat] of (feature.geometry?.coordinates ?? []).flat(
					2,
				)) {
					expect(lng >= -169 && lng <= 191, `${name}: longitude ${lng}`).toBe(
						true,
					);
					expect(lat >= -90 && lat <= 90, `${name}: latitude ${lat}`).toBe(
						true,
					);
				}
			}
		}
	});

	it("closes every ring, and no ring jumps across the map", () => {
		for (const [name, file] of allFiles) {
			for (const feature of file.features) {
				for (const ring of (feature.geometry?.coordinates ?? []).flat()) {
					expect(ring.length, name).toBeGreaterThanOrEqual(4);
					expect(ring[0], name).toEqual(ring[ring.length - 1]);
					for (let i = 1; i < ring.length; i++) {
						const step = Math.abs(
							(ring[i] as Point)[0] - (ring[i - 1] as Point)[0],
						);
						expect(step, name).toBeLessThan(180);
					}
				}
			}
		}
	});

	it("files neutral land by continent: one feature each in the world file, one in a continent's file", () => {
		const neutralContinents = (file: MapFile) =>
			file.features
				.filter(
					(feature): feature is MapNeutralFeature =>
						"neutral" in feature.properties,
				)
				.map((feature) => feature.properties.continent);
		expect(neutralContinents(worldFile).sort()).toEqual(
			Object.keys(continentFiles).sort(),
		);
		for (const [continent, file] of Object.entries(continentFiles)) {
			expect(neutralContinents(file)).toEqual([continent]);
		}
	});

	it("has no Antarctica", () => {
		for (const [name, file] of allFiles) {
			expect(at(file, [0, -80]), name).toEqual([]);
			expect(at(file, [100, -75]), name).toEqual([]);
		}
	});

	it("keeps the world file under 60 KB and each continent file under 100 KB, gzipped", async () => {
		expect(await gzippedSize(worldFile), "world").toBeLessThan(60_000);
		for (const [name, file] of Object.entries(continentFiles)) {
			expect(await gzippedSize(file), name).toBeLessThan(100_000);
		}
	});
});

// One test per border choice in ADR 0020. Each checks a place on the ground.
describe("map geometry: border choices (ADR 0020)", () => {
	const { africa, asia, europe } = continentFiles;
	const southAmerica = continentFiles["south-america"];
	const northAmerica = continentFiles["north-america"];

	it("draws Kosovo as its own country, separate from Serbia", () => {
		const pristina: Point = [21.17, 42.66];
		expect(at(europe, pristina)).toEqual(["XK"]);
		expect(at(worldFile, pristina)).toEqual(["XK"]);
		expect(at(europe, [20.46, 44.3])).toEqual(["RS"]); // south of Belgrade
	});

	it("draws Taiwan as its own country", () => {
		expect(at(asia, [121, 24])).toEqual(["TW"]);
		expect(at(worldFile, [121, 24])).toEqual(["TW"]);
	});

	it("draws Somaliland as part of Somalia", () => {
		const hargeisa: Point = [44.06, 9.56];
		expect(at(africa, hargeisa)).toEqual(["SO"]);
		expect(at(worldFile, hargeisa)).toEqual(["SO"]);
	});

	it("draws Crimea as part of Ukraine", () => {
		const simferopol: Point = [34.1, 44.95];
		expect(at(europe, simferopol)).toEqual(["UA"]);
		expect(at(worldFile, simferopol)).toEqual(["UA"]);
	});

	it("draws all of Western Sahara as neutral land, and Morocco north of 27°40′ N", () => {
		for (const file of [africa, worldFile]) {
			expect(at(file, [-13.0, 27.0])).toEqual(["neutral"]); // near Laayoune
			expect(at(file, [-15.5, 23.8])).toEqual(["neutral"]); // near Dakhla
			expect(at(file, [-9.5, 26.5])).toEqual(["neutral"]); // east of the sand wall
			expect(at(file, [-10.0, 28.5])).toEqual(["MA"]); // near Tan-Tan
			expect(at(file, [-6.5, 33.5])).toEqual(["MA"]); // near Rabat
		}
		const morocco = country(africa, "MA")?.geometry?.coordinates.flat(2) ?? [];
		const southernmost = Math.min(...morocco.map(([, lat]) => lat));
		expect(southernmost).toBeCloseTo(27.67, 2);
	});

	it("draws Åland as part of Finland", () => {
		expect(at(europe, [19.95, 60.25])).toEqual(["FI"]);
	});

	it("draws France's overseas departments as neutral land", () => {
		expect(at(southAmerica, [-53, 4])).toEqual(["neutral"]); // French Guiana
		expect(at(worldFile, [-53, 4])).toEqual(["neutral"]);
		expect(at(africa, [55.5, -21.1])).toEqual(["neutral"]); // Réunion
		expect(at(northAmerica, [-61.0, 14.65])).toEqual(["neutral"]); // Martinique
		const france = country(europe, "FR")?.geometry?.coordinates.flat(2) ?? [];
		for (const [lng, lat] of france) {
			expect(lng > -10 && lng < 15 && lat > 40 && lat < 52).toBe(true);
		}
		expect(at(europe, [9.1, 42.2])).toEqual(["FR"]); // Corsica stays French
	});

	it("draws the Caribbean Netherlands as neutral land", () => {
		expect(
			at(southAmerica, [-68.3, 12.2]).concat(at(northAmerica, [-68.3, 12.2])),
		).toEqual(["neutral"]); // Bonaire
		const netherlands =
			country(europe, "NL")?.geometry?.coordinates.flat(2) ?? [];
		for (const [lng] of netherlands) expect(lng).toBeGreaterThan(0);
	});

	it("draws Northern Cyprus as neutral land", () => {
		expect(at(asia, [33.6, 35.3])).toEqual(["neutral"]);
		expect(at(asia, [33.0, 34.8])).toEqual(["CY"]);
	});

	it("draws Hong Kong and Macao as neutral land (undecided)", () => {
		expect(at(asia, [114.15, 22.4])).toEqual(["neutral"]);
	});

	it("draws Greenland and Puerto Rico as neutral land", () => {
		expect(at(worldFile, [-42, 72])).toEqual(["neutral"]);
		expect(at(northAmerica, [-66.4, 18.2])).toEqual(["neutral"]);
	});

	it("keeps distant parts that are fully part of their country", () => {
		expect(at(northAmerica, [-150, 65])).toEqual(["US"]); // Alaska
		expect(at(northAmerica, [-155.5, 19.6])).toEqual(["US"]); // Hawaii
		expect(at(europe, [18, 79])).toEqual(["NO"]); // Svalbard
		expect(at(europe, [-16.5, 28.3])).toEqual(["ES"]); // Tenerife
	});

	it("draws the contested areas listed in ADR 0020 as the source data has them", () => {
		// Not endorsements: these pin down what the map shows today, so that a
		// change in the source data can't alter a border without a failing test.
		expect(at(asia, [35.8, 33.0])).toEqual(["IL"]); // Golan Heights
		expect(at(asia, [35.25, 32.0])).toEqual(["PS"]); // West Bank
		expect(at(asia, [74.8, 34.1])).toEqual(["IN"]); // Kashmir valley
		expect(at(asia, [74.5, 35.9])).toEqual(["PK"]); // Gilgit
		expect(at(asia, [79.5, 35.0])).toEqual(["CN"]); // Aksai Chin
		expect(at(asia, [94.5, 28.0])).toEqual(["IN"]); // Arunachal Pradesh
		expect(at(asia, [41.0, 43.1])).toEqual(["GE"]); // Abkhazia
		expect(at(asia, [44.0, 42.3])).toEqual(["GE"]); // South Ossetia
		expect(at(asia, [46.75, 39.8])).toEqual(["AZ"]); // Nagorno-Karabakh
		expect(at(europe, [29.5, 46.9])).toEqual(["MD"]); // Transnistria
		expect(at(europe, [37.8, 48.0])).toEqual(["UA"]); // Donetsk
		expect(at(africa, [36.0, 22.5])).toEqual(["EG"]); // Hala'ib triangle
		expect(at(africa, [35.3, 4.8])).toEqual(["KE"]); // Ilemi triangle
		expect(at(africa, [28.6, 9.6])).toEqual(["SD"]); // Abyei
		expect(at(europe, [147.9, 45.0])).toEqual(["RU"]); // Kuril Islands (Iturup)
	});

	it("keeps Russia in one piece across the 180° line, labelled in European Russia", () => {
		// Chukotka is at 175° W: longitude 185 on this map.
		expect(at(europe, [185, 66.5])).toEqual(["RU"]);
		expect(at(worldFile, [185, 66.5])).toEqual(["RU"]);
		const label = country(europe, "RU")?.properties.label as Point;
		expect(label[0]).toBeLessThan(60); // west of the Urals
		expect(contains(country(europe, "RU")?.geometry, label)).toBe(true);
	});
});
