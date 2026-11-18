// Builds the map geometry (docs/specs/mvp.md §2, ADR 0020, ADR 0021):
// Natural Earth's own files → country shapes per ISO code, as GeoJSON that
// MapLibre draws. Writes one detailed file of the whole world,
// app/features/maps/geometry/world.json, and from the same shapes the small
// outlines on the panels' tiles, app/features/maps/geometry/outlines/*.json.
//
// What comes from where:
// - Shapes, codes, label points, label zooms and ranks: Natural Earth, as it is.
// - Cutting, merging, simplifying and rounding: mapshaper. For the outlines
//   also the projection and the fitting to a box.
// - Ours: the border choices below, and which fields go in the file.
//
// Run with `pnpm build:maps`, and commit the result. `pnpm maps:check` fails
// when the committed file differs from a fresh build. The source files are
// downloaded once (about 30 MB) into .cache/, which is not committed. Behind a
// proxy, run it with NODE_USE_ENV_PROXY=1.
//
// EVERY BORDER CHOICE made here is recorded in ADR 0020, a high-risk decision.
// Change the two together, and add a test for the choice in geometry.test.ts.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import mapshaper from "mapshaper";
import {
	type Continent,
	countries,
	regions,
} from "../app/features/countries/countries.ts";
import type {
	MapCountryFeature,
	MapFile,
	MapNeutralFeature,
} from "../app/features/maps/map-file.ts";
import {
	type ContinentOutlines,
	type CountryOutlines,
	OUTLINE_BOX,
	OUTLINE_FILE_BUDGET_BYTES,
} from "../app/features/maps/outline-file.ts";
import {
	CONTINENT_FRAMES,
	landInReach,
	outlineCentre,
} from "../app/features/maps/outline-land.ts";

// --- The source: Natural Earth, pinned --------------------------------------------

const NATURAL_EARTH_VERSION = "5.1.2";

/** Each file's SHA-256, so the source can't change under us. */
const SOURCES = {
	/** Every country, with overseas parts as pieces of their own. The shapes. */
	units: {
		file: "ne_10m_admin_0_map_units",
		sha256: "57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862",
	},
	/** Disputed areas as shapes of their own: Crimea, Western Sahara and more. */
	disputed: {
		file: "ne_10m_admin_0_disputed_areas",
		sha256: "9cafef8b7dfb6b164dc58f218f981f4ace9f716f6c03795d4c62d1ac9f3d50f5",
	},
	/** One entry per country: its code, label point, label zooms and rank. */
	countries: {
		file: "ne_10m_admin_0_countries",
		sha256: "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255",
	},
	/** Coarser shapes. Only the Vatican's is used: see VATICAN below. */
	coarse: {
		file: "ne_50m_admin_0_countries",
		sha256: "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
	},
} as const;

// --- Settings ---------------------------------------------------------------------

/**
 * The longitude in the middle of the map. The map's edge is then 169° W, in the
 * Bering Strait, instead of 180°: Russia and most of Oceania stay in one piece.
 * Shapes are cut at that edge, and longitudes run from -169 to 191.
 */
const CENTRE_LONGITUDE = 11;
const EDGE_LONGITUDE = CENTRE_LONGITUDE - 180;

/** The map file must stay under this, gzipped (ADR 0020). */
const BUDGET_BYTES = 2_500_000;

/** Coordinates are rounded to this: 0.001° is about 100 m. */
const PRECISION = 0.001;

/**
 * How much detail is kept, as mapshaper's simplification interval in metres.
 * The source is Natural Earth's finest data (1:10 million).
 */
const SIMPLIFY_METRES = 450;

// --- Border choices (ADR 0020) ----------------------------------------------------

/**
 * Pieces of a country that we draw as neutral land, by Natural Earth's
 * map-unit code: France's overseas departments and the Caribbean Netherlands.
 */
const NEUTRAL_UNITS: Record<string, string> = {
	GUF: "French Guiana",
	GLP: "Guadeloupe",
	MTQ: "Martinique",
	REU: "Réunion",
	MYT: "Mayotte",
	NLY: "Bonaire, Sint Eustatius and Saba",
};

/**
 * Territories that the source data files under their owner's country code,
 * but as entries of their own. They are neutral land, as every other territory
 * with an entry of its own is. By Natural Earth's country code (ADM0_A3).
 */
const NEUTRAL_TERRITORIES: Record<string, string> = {
	CLP: "Clipperton Island (France)",
	ATC: "Ashmore and Cartier Islands (Australia)",
	CSI: "Coral Sea Islands (Australia)",
	IOA: "Christmas Island and the Cocos Islands (Australia)",
	BRI: "Brazilian Island, claimed by Brazil and Uruguay",
};

/**
 * Entries of their own in the source data that we draw as part of a country.
 * By Natural Earth's country code (ADM0_A3).
 */
const PART_OF: Record<string, string> = {
	ALD: "FI", // Åland
	SOL: "SO", // Somaliland (mvp.md §2)
	KAB: "KZ", // Baikonur, the cosmodrome Kazakhstan leases to Russia
};

/**
 * Disputed areas that we draw as part of another country than the source data
 * does. Each is a shape in Natural Earth's disputed-areas layer.
 */
const MOVED_AREAS = [
	// The source data draws Crimea as part of Russia.
	{ name: "Crimea", from: "Russia", to: "UA" },
	// The source data draws everything west of the sand wall as Morocco, and
	// only the strip east of it as Western Sahara. This is the part west of it.
	{ name: "Morocco", from: "Morocco", to: "EH" },
];

/**
 * The finest data has the Vatican squashed to a sliver 100 m across. Its shape
 * comes from the coarser file.
 */
const VATICAN = "VA";

/**
 * Label points that differ from Natural Earth's.
 * - Kiribati's is on Kiritimati, 3,000 km east of the capital and on the far
 *   side of the map's edge. Ours is on South Tarawa, the capital: on its land,
 *   not in the lagoon, so that the country view and the outline frame Tarawa
 *   and not the eight atolls within 150 km of the lagoon (ADR 0020).
 */
const LABEL_OVERRIDES: Record<string, [lng: number, lat: number]> = {
	KI: [173.1, 1.365],
};

// --- Reading the source -----------------------------------------------------------

type SourceFeature = {
	type: "Feature";
	properties: Record<string, unknown>;
	geometry: { type: string; coordinates: unknown };
};

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = resolve(
	here,
	`../.cache/natural-earth-${NATURAL_EARTH_VERSION}`,
);

async function read(source: keyof typeof SOURCES): Promise<SourceFeature[]> {
	const { file, sha256 } = SOURCES[source];
	const path = resolve(cacheDir, `${file}.geojson`);
	const matches = (bytes: Buffer) =>
		createHash("sha256").update(bytes).digest("hex") === sha256;

	let bytes = existsSync(path) ? readFileSync(path) : undefined;
	if (!bytes || !matches(bytes)) {
		const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v${NATURAL_EARTH_VERSION}/geojson/${file}.geojson`;
		const response = await fetch(url).catch((error: unknown) => {
			throw new Error(
				`Couldn't download ${url}. Behind a proxy, set NODE_USE_ENV_PROXY=1.`,
				{ cause: error },
			);
		});
		if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
		bytes = Buffer.from(await response.arrayBuffer());
		if (!matches(bytes)) {
			throw new Error(`${file} isn't the file this script was written for`);
		}
		mkdirSync(cacheDir, { recursive: true });
		writeFileSync(path, bytes);
	}
	return (JSON.parse(bytes.toString("utf8")) as { features: SourceFeature[] })
		.features;
}

function text(feature: SourceFeature, field: string): string {
	const value = feature.properties[field];
	if (typeof value !== "string") throw new Error(`No ${field} in the source`);
	return value;
}

function number(feature: SourceFeature, field: string): number {
	const value = feature.properties[field];
	if (typeof value !== "number") throw new Error(`No ${field} in the source`);
	return value;
}

const sourceCountries = await read("countries");
const ourCodes = new Set(countries.map((country) => country.iso));

/**
 * Which country in our list each of Natural Earth's countries is drawn as
 * (by ADM0_A3). Anything not in here is neutral land.
 */
const isoByCountry = new Map<string, string>();
/** Natural Earth's own entry for each country in our list: its label fields. */
const entryByIso = new Map<string, SourceFeature>();

for (const entry of sourceCountries) {
	const adm0 = text(entry, "ADM0_A3");
	if (adm0 in NEUTRAL_TERRITORIES) continue;
	const partOf = PART_OF[adm0];
	if (partOf) {
		isoByCountry.set(adm0, partOf);
		continue;
	}
	// Natural Earth's two-letter code. Unlike ISO_A2, it is filled in for
	// France, Norway, Kosovo (XK) and Taiwan.
	const iso = text(entry, "ISO_A2_EH");
	if (!ourCodes.has(iso)) continue;
	// If the source data ever files another territory under a country's code,
	// stop: it must be added to one of the tables above, and to ADR 0020.
	if (entryByIso.has(iso)) {
		throw new Error(`Two entries in the source data have the code ${iso}`);
	}
	entryByIso.set(iso, entry);
	isoByCountry.set(adm0, iso);
}
for (const table of [NEUTRAL_TERRITORIES, PART_OF]) {
	for (const adm0 of Object.keys(table)) {
		if (!sourceCountries.some((entry) => text(entry, "ADM0_A3") === adm0)) {
			throw new Error(`No ${adm0} in the source data any more`);
		}
	}
}

// --- The shapes, sorted into countries and neutral land ---------------------------

type Piece = {
	type: "Feature";
	/** The country's code, or "" for neutral land. */
	properties: { iso: string };
	geometry: SourceFeature["geometry"];
};

const foundUnits = new Set<string>();
const units: Piece[] = (await read("units"))
	.filter((unit) => text(unit, "ADM0_A3") !== "ATA") // Antarctica
	.map((unit) => {
		const code = text(unit, "GU_A3");
		const isNeutral = code in NEUTRAL_UNITS;
		if (isNeutral) foundUnits.add(code);
		const iso = isNeutral ? undefined : isoByCountry.get(text(unit, "ADM0_A3"));
		return { ...unit, properties: { iso: iso ?? "" } };
	})
	// The Vatican's shape comes from the coarser file, below.
	.filter((unit) => unit.properties.iso !== VATICAN);
if (foundUnits.size !== Object.keys(NEUTRAL_UNITS).length) {
	throw new Error("An overseas part is no longer a piece of its own");
}

// Shapes that are cut out of whatever the source data has there, and drawn as
// the country we say.
const disputed = await read("disputed");
const moved: Piece[] = MOVED_AREAS.map(({ name, from, to }) => {
	const found = disputed.filter(
		(area) => text(area, "NAME") === name && text(area, "ADMIN") === from,
	);
	// If the source data changes how it draws these, stop instead of guessing.
	const [area] = found;
	if (!area || found.length > 1) {
		throw new Error(`Expected one disputed area "${name}" in ${from}`);
	}
	return { ...area, properties: { iso: to } };
});
const vatican = (await read("coarse")).find(
	(entry) => text(entry, "ISO_A2_EH") === VATICAN,
);
if (!vatican) throw new Error("No Vatican in the coarser file");
moved.push({ ...vatican, properties: { iso: VATICAN } });

// --- mapshaper does the geometry --------------------------------------------------

const collection = (features: Piece[]) =>
	JSON.stringify({ type: "FeatureCollection", features });
const output = await mapshaper.applyCommands(
	[
		"-i units.json moved.json combine-files",
		// Cut the moved areas out of the countries they are drawn in, and add
		// them as the countries we say. Then one shape per country: the borders
		// between its pieces disappear.
		"-erase target=units source=moved",
		"-merge-layers target=units,moved force name=land",
		"-dissolve iso",
		// Turn the world so that the map's edge is where 180° was: mapshaper
		// cuts shapes at the new edge and joins what was cut at the old one.
		// (-rotate is in mapshaper but not in its documentation. The documented
		// way, -clip and -affine on each side of the edge, loses the holes in
		// countries, and with them Lesotho and San Marino. It must come before
		// -simplify: after it, -rotate loses whole countries.)
		`-rotate ${-CENTRE_LONGITUDE}`,
		// keep-shapes: a country or an island is never simplified away.
		`-simplify interval=${SIMPLIFY_METRES} keep-shapes`,
		// Shift the longitudes back, so that they run from -169 to 191.
		`-affine shift=${CENTRE_LONGITUDE},0`,
		`-o world.json target=land format=geojson precision=${PRECISION}`,
	].join(" "),
	{ "units.json": collection(units), "moved.json": collection(moved) },
);

type Shape = {
	properties: { iso: string };
	geometry:
		| { type: "Polygon"; coordinates: [number, number][][] }
		| { type: "MultiPolygon"; coordinates: [number, number][][][] }
		| null;
};
const shapes = new Map<string, [number, number][][][]>();
const world = JSON.parse(String(output["world.json"])) as { features: Shape[] };
for (const { properties, geometry } of world.features) {
	if (!geometry) continue;
	shapes.set(
		properties.iso,
		geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates,
	);
}

// --- Building the file ------------------------------------------------------------

function labelOf(iso: string, entry: SourceFeature): [number, number] {
	const [lng, lat] = LABEL_OVERRIDES[iso] ?? [
		number(entry, "LABEL_X"),
		number(entry, "LABEL_Y"),
	];
	const round = (value: number) => Math.round(value * 10_000) / 10_000;
	// West of the map's edge is on its far right, as for the shapes.
	return [round(lng < EDGE_LONGITUDE ? lng + 360 : lng), round(lat)];
}

const countryFeatures = [...ourCodes].sort().map((iso): MapCountryFeature => {
	const entry = entryByIso.get(iso);
	const coordinates = shapes.get(iso);
	if (!entry || !coordinates) throw new Error(`No shape for ${iso}`);
	return {
		type: "Feature",
		properties: {
			iso,
			label: labelOf(iso, entry),
			labelMinZoom: number(entry, "MIN_LABEL"),
			labelMaxZoom: number(entry, "MAX_LABEL"),
			labelRank: number(entry, "LABELRANK"),
		},
		geometry: { type: "MultiPolygon", coordinates },
	};
});

const neutral: MapNeutralFeature = {
	type: "Feature",
	properties: { neutral: true },
	geometry: { type: "MultiPolygon", coordinates: shapes.get("") ?? [] },
};
const file: MapFile = {
	type: "FeatureCollection",
	features: [...countryFeatures, neutral],
};

const outDir = resolve(here, "../app/features/maps/geometry");
mkdirSync(outDir, { recursive: true });
const json = `${JSON.stringify(file)}\n`;
const size = gzipSync(json, { level: 9 }).length;
writeFileSync(resolve(outDir, "world.json"), json);

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;
console.log(
	`world.json: ${megabytes(size)} gzipped (budget ${megabytes(BUDGET_BYTES)}), ` +
		`${megabytes(json.length)} on disk, ${countryFeatures.length} countries`,
);
if (size > BUDGET_BYTES) {
	throw new Error("world.json is over its size budget");
}

// --- The outlines on the panels' tiles --------------------------------------------
//
// The same shapes, with every border choice above already made, drawn small:
// each country, and each continent, as an SVG path fitted to a box 100 × 100.
// mapshaper projects, simplifies, fits and writes the path. Which land is
// shown is in outline-land.ts: a country's main body with its nearby islands.

/**
 * How much detail an outline keeps: mapshaper simplifies for a drawing this
 * many pixels across. The tiles are 32 to 48 px. (96, not 100: drawn in
 * their own projections, Europe's outlines are fuller and its file would
 * be over its budget.)
 */
const OUTLINE_RESOLUTION = 96;

/** One outline: these shapes, projected around their own centre. */
async function outlineOf(
	geometry: MapCountryFeature["geometry"],
	{ clip, keepShapes }: { clip?: readonly number[]; keepShapes: boolean },
): Promise<string> {
	// A continent is centred on its view's box, a country on its land.
	const [lng, lat] = clip
		? [
				((clip[0] ?? 0) + (clip[2] ?? 0)) / 2,
				((clip[1] ?? 0) + (clip[3] ?? 0)) / 2,
			]
		: outlineCentre(geometry.coordinates);
	const simplified = await mapshaper.applyCommands(
		[
			"-i land.json",
			// A continent is its countries merged. A country's pieces of land
			// stay pieces of their own, so that keep-shapes protects each one.
			keepShapes ? "-explode" : "-dissolve",
			clip ? `-clip bbox=${clip.join(",")}` : "",
			// Each outline in a projection of its own, centred on its land: a
			// world projection shears land far from its centre (Australia, in
			// Equal Earth centred on Europe). Lambert azimuthal equal-area keeps
			// areas, and shapes near the centre, as atlases draw one country.
			// The land is first shifted so that its centre is at 0°: mapshaper
			// reads longitudes past 180° (Fiji, Tonga) as not longitudes at all.
			`-affine shift=${-lng},0`,
			`-proj +proj=laea +lon_0=0 +lat_0=${lat}`,
			// keep-shapes: no piece of land is simplified away, however small it
			// is in its box (Kiribati's atolls).
			`-simplify resolution=${OUTLINE_RESOLUTION}${keepShapes ? " keep-shapes" : ""}`,
			"-each 'piece = this.id'",
			"-o simplified.json format=geojson",
		].join(" "),
		{
			"land.json": JSON.stringify({
				type: "Feature",
				properties: {},
				geometry,
			}),
		},
	);
	type Piece = { properties: { piece: number } };
	let pieces = (
		JSON.parse(String(simplified["simplified.json"])) as { features: Piece[] }
	).features;

	// mapshaper fits the box around every piece, and leaves out of the SVG any
	// piece too small to draw at whole-number coordinates (four of Kiribati's
	// eight atolls). So the box is fitted again around the pieces that are
	// drawn, until all of them are: the outline is then truly centred.
	for (;;) {
		const out = await mapshaper.applyCommands(
			`-i pieces.json -o outline.svg format=svg id-field=piece width=${OUTLINE_BOX} height=${OUTLINE_BOX} margin=0 precision=1`,
			{
				"pieces.json": JSON.stringify({
					type: "FeatureCollection",
					features: pieces,
				}),
			},
		);
		const paths = [
			...String(out["outline.svg"]).matchAll(
				/<path d="([^"]*)"[^>]* id="(\d+)"/g,
			),
		];
		const drawn = new Set(paths.map(([, , id]) => Number(id)));
		if (drawn.size === pieces.length) {
			return paths.map(([, path]) => path).join(" ");
		}
		pieces = pieces.filter((piece) => drawn.has(piece.properties.piece));
	}
}

const continentIds = Object.keys(CONTINENT_FRAMES) as Continent[];
const countryOutlines = new Map<string, string>();
for (const feature of countryFeatures) {
	countryOutlines.set(
		feature.properties.iso,
		await outlineOf(
			{ type: "MultiPolygon", coordinates: landInReach(feature) },
			{ keepShapes: true },
		),
	);
}

const outlineFiles: Record<string, CountryOutlines | ContinentOutlines> = {};
const continentOutlines: Partial<ContinentOutlines> = {};
for (const continent of continentIds) {
	const isos = countries
		.filter((country) => country.continent === continent)
		.map((country) => country.iso)
		.sort();
	outlineFiles[continent] = Object.fromEntries(
		isos.map((iso) => [iso, countryOutlines.get(iso) ?? ""]),
	);
	// The continent: its countries merged, inside its view's box. Islands too
	// small to see at this size are left to the simplifying.
	continentOutlines[continent] = await outlineOf(
		{
			type: "MultiPolygon",
			coordinates: countryFeatures
				.filter((feature) => isos.includes(feature.properties.iso))
				.flatMap((feature) => feature.geometry.coordinates),
		},
		{ clip: CONTINENT_FRAMES[continent], keepShapes: false },
	);
}
outlineFiles.continents = continentOutlines as ContinentOutlines;

const outlinesDir = resolve(outDir, "outlines");
mkdirSync(outlinesDir, { recursive: true });
const kilobytes = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;
for (const [name, outlines] of Object.entries(outlineFiles)) {
	for (const [key, outline] of Object.entries(outlines)) {
		if (!outline) throw new Error(`No outline for ${key}`);
	}
	const text = `${JSON.stringify(outlines)}\n`;
	const gzipped = gzipSync(text, { level: 9 }).length;
	writeFileSync(resolve(outlinesDir, `${name}.json`), text);
	console.log(
		`outlines/${name}.json: ${kilobytes(gzipped)} gzipped ` +
			`(budget ${kilobytes(OUTLINE_FILE_BUDGET_BYTES)}), ${kilobytes(text.length)} on disk, ` +
			`${Object.keys(outlines).length} outlines`,
	);
	if (gzipped > OUTLINE_FILE_BUDGET_BYTES) {
		throw new Error(`outlines/${name}.json is over its size budget`);
	}
}

// --- The same outlines for Storybook (a proposal, not shipped) --------------------
//
// The design system can't import from the app (ADR 0008), so the stories that
// show the outlines to Thor get a copy with the names beside them. It goes
// when the tile is a real component that the app feeds.

/** The countries in the "hard cases" story: small, scattered and very large. */
const HARD_CASES = [
	...[
		"SC",
		"MV",
		"KI",
		"TV",
		"VA",
		"MC",
		"NR",
		"FJ",
		"ID",
		"RU",
		"CV",
		"ST",
		"KM",
	],
	...["DK", "IT", "GB", "JP", "PH", "GR", "FR", "US", "NO", "PT", "ES", "NZ"],
	...["MH", "FM", "TO", "PW"],
];

const storyData = {
	continents: continentIds.map((continent) => ({
		id: continent,
		d: continentOutlines[continent] ?? "",
		countries: countries
			.filter((country) => country.continent === continent)
			.map(({ iso, name, region }) => ({
				iso,
				name,
				region: regions[region].name,
				d: countryOutlines.get(iso) ?? "",
			})),
	})),
	hardCases: HARD_CASES.map((iso) => ({
		iso,
		name: countries.find((country) => country.iso === iso)?.name ?? iso,
		d: countryOutlines.get(iso) ?? "",
	})),
};
writeFileSync(
	resolve(here, "../../../packages/ui/src/proposals/outlines.generated.json"),
	`${JSON.stringify(storyData, null, "\t")}\n`,
);
