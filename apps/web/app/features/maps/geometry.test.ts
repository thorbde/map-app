import { describe, expect, it } from "vitest";
import { type Continent, countries } from "../countries";
import africa from "./geometry/africa.json";
import asia from "./geometry/asia.json";
import europe from "./geometry/europe.json";
import northAmerica from "./geometry/north-america.json";
import oceania from "./geometry/oceania.json";
import southAmerica from "./geometry/south-america.json";
import world from "./geometry/world.json";
import type { MapFile } from "./map-file";

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

const isos = new Set(countries.map((country) => country.iso));

/** Can this country be drawn as something to click: a shape, or a marker dot? */
function isDrawn(file: MapFile, iso: string): boolean {
	const country = file.countries[iso];
	return (
		country !== undefined && (Boolean(country.d) || country.marker === true)
	);
}

function isInFrame(file: MapFile, iso: string): boolean {
	const [x, y, width, height] = file.frame;
	const at = file.countries[iso]?.at;
	return (
		at !== undefined &&
		at[0] >= x &&
		at[0] <= x + width &&
		at[1] >= y &&
		at[1] <= y + height
	);
}

async function gzippedSize(file: MapFile): Promise<number> {
	// The same bytes the build script writes: JSON on one line, then a newline.
	const stream = new Blob([`${JSON.stringify(file)}\n`])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	return (await new Response(stream).arrayBuffer()).byteLength;
}

describe("map geometry", () => {
	it("has every one of the 197 countries in the world file, as a shape or a marker", () => {
		const missing = countries.filter(({ iso }) => !isDrawn(worldFile, iso));
		expect(missing).toEqual([]);
		expect(Object.keys(worldFile.countries)).toHaveLength(197);
	});

	it("has every country in its own continent's file, inside the frame", () => {
		const missing = countries.filter(({ iso, continent }) => {
			const file = continentFiles[continent];
			return (
				!isDrawn(file, iso) ||
				!isInFrame(file, iso) ||
				file.countries[iso]?.neighbour === true
			);
		});
		expect(missing).toEqual([]);
	});

	it("marks every country without a shape as a marker", () => {
		for (const [, file] of allFiles) {
			for (const country of Object.values(file.countries)) {
				if (!country.d) expect(country.marker).toBe(true);
			}
		}
	});

	it("marks Africa's small island states as markers", () => {
		for (const iso of ["CV", "ST", "KM", "MU", "SC"]) {
			expect(continentFiles.africa.countries[iso]?.marker).toBe(true);
		}
	});

	it("only uses ISO codes from the country list", () => {
		for (const [, file] of allFiles) {
			const unknown = Object.keys(file.countries).filter(
				(iso) => !isos.has(iso),
			);
			expect(unknown).toEqual([]);
		}
	});

	it("flags countries from other continents as neighbours, and only those", () => {
		const continentOf = new Map(
			countries.map((country) => [country.iso, country.continent]),
		);
		for (const [continent, file] of Object.entries(continentFiles)) {
			for (const [iso, country] of Object.entries(file.countries)) {
				expect(country.neighbour === true, `${iso} in ${continent}`).toBe(
					continentOf.get(iso) !== continent,
				);
			}
		}
		const worldNeighbours = Object.values(worldFile.countries).filter(
			(country) => country.neighbour,
		);
		expect(worldNeighbours).toEqual([]);
	});

	it("draws Kosovo as its own shape, separate from Serbia", () => {
		for (const file of [worldFile, continentFiles.europe]) {
			expect(file.countries.XK?.d).toBeTruthy();
			expect(file.countries.RS?.d).toBeTruthy();
			expect(file.countries.XK?.d).not.toBe(file.countries.RS?.d);
			expect(file.countries.XK?.neighbour).toBeUndefined();
		}
	});

	it("shows Russia whole in Europe, and as a neighbour in Asia", () => {
		expect(continentFiles.europe.countries.RU?.d).toBeTruthy();
		expect(continentFiles.europe.countries.RU?.neighbour).toBeUndefined();
		expect(continentFiles.asia.countries.RU?.d).toBeTruthy();
		expect(continentFiles.asia.countries.RU?.neighbour).toBe(true);
	});

	it("uses the same coordinate space and label points in every file", () => {
		for (const [, file] of allFiles) {
			expect(file.width).toBe(worldFile.width);
			expect(file.height).toBe(worldFile.height);
			for (const [iso, country] of Object.entries(file.countries)) {
				expect(country.at).toEqual(worldFile.countries[iso]?.at);
			}
		}
	});

	it("has neutral land in every file", () => {
		// Greenland, Western Sahara, Northern Cyprus, French Guiana and the like
		// have no ISO key (checked above); they are part of the neutral path.
		for (const [, file] of allFiles) {
			expect(file.neutral.length).toBeGreaterThan(0);
		}
	});

	it("keeps every file under 50 KB gzipped", async () => {
		for (const [name, file] of allFiles) {
			expect(await gzippedSize(file), name).toBeLessThan(50_000);
		}
	});
});
