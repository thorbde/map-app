// Everything that touches MapLibre (ADR 0021). The map component imports this
// file lazily, so MapLibre is not part of any page's first load, and ".client"
// keeps it out of the server bundle.
import "maplibre-gl/dist/maplibre-gl.css";
import type {
	ExpressionSpecification,
	GeoJSONSource,
	GeoJSONSourceSpecification,
	MapMouseEvent,
} from "maplibre-gl";
// MapLibre does its heavy work in background workers, from a file of its own.
// Vite has to be told to bundle that file, or it isn't served.
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Continent } from "../countries";
import { equalEarthProjection } from "./equal-earth";
import equalEarthWorkerUrl from "./equal-earth.worker?worker&url";
import worldUrl from "./geometry/world.json?url";
import type { MapCountryFeature, MapFile } from "./map-file";
import {
	type Bounds,
	boxesOverlap,
	CONTINENT_BOUNDS,
	cameraFor,
	countryBounds,
	type FlatBox,
	flatBox,
	type MapView,
	viewBox,
	WORLD_BOUNDS,
} from "./views";

// The detailed map files, one per continent (ADR 0020). Each is fetched only
// when the viewer zooms in on that continent.
const detailUrls = import.meta.glob<string>("./geometry/*.json", {
	query: "?url",
	import: "default",
});

export type MapState = {
	view: MapView;
	/** ISO codes of the written countries the viewer may see. */
	written: readonly string[];
	selected?: string;
	/** The owner can open every country; a visitor only the written ones. */
	owner: boolean;
};

export type MapEngineOptions = {
	container: HTMLElement;
	/** English country names by ISO code, for the labels. */
	names: Readonly<Record<string, string>>;
	/** Each country's continent, by ISO code. */
	continents: Readonly<Record<string, Continent>>;
	state: MapState;
	onOpenCountry: (iso: string) => void;
};

export type MapEngine = {
	update: (state: MapState) => void;
	destroy: () => void;
};

/** How far from a marker dot a click still counts, in pixels. */
const CLICK_REACH = 6;

/** The closest the camera gets: about as close as the detailed shapes hold up. */
const MAX_ZOOM = 7;

/**
 * From this zoom on, the continents in view get their detailed shapes. The
 * world view on a laptop is around zoom 1.3, and a continent view around 3.
 */
const DETAIL_FROM_ZOOM = 2.2;

// --- Colours come from the design tokens (ADR 0014) -----------------------------

/** A token's colour as "#rrggbb", which is what MapLibre understands. */
function tokenColour(element: HTMLElement, token: string): string {
	const value = getComputedStyle(element).getPropertyValue(token).trim();
	const context = document.createElement("canvas").getContext("2d");
	if (!value || !context) throw new Error(`No value for the token ${token}`);
	// A canvas normalises any CSS colour it is given.
	context.fillStyle = value;
	return context.fillStyle;
}

function readColours(element: HTMLElement) {
	return {
		ocean: tokenColour(element, "--color-map-ocean"),
		land: tokenColour(element, "--color-map-land"),
		border: tokenColour(element, "--color-map-border"),
		written: tokenColour(element, "--color-map-written"),
		selected: tokenColour(element, "--color-map-selected"),
		label: tokenColour(element, "--color-text-default"),
		labelOnSelected: tokenColour(element, "--color-text-on-inverse"),
		// The outline of an unwritten marker dot. It has to reach 3:1 against both
		// the land and the ocean (DESIGN.md): this is 6.2:1 and 5.1:1. The map's
		// border colour and the control border colour don't reach it on the ocean.
		markerOutline: tokenColour(element, "--color-text-muted"),
	};
}

// --- Setting up MapLibre, once per page -----------------------------------------

type MapLibre = typeof import("maplibre-gl");

let mapLibreReady: Promise<MapLibre> | undefined;

/**
 * Loads MapLibre, and registers Equal Earth with it and with its workers.
 *
 * MapLibre is imported on its own, not together with this file, so that it gets
 * a file of its own. That file only changes when we upgrade MapLibre, so a
 * returning visitor doesn't download it again when our own map code changes.
 */
function loadMapLibre(): Promise<MapLibre> {
	mapLibreReady ??= import("maplibre-gl").then(async (mapLibre) => {
		mapLibre.setWorkerUrl(mapLibreWorkerUrl);
		await mapLibre.importScriptInWorkers(equalEarthWorkerUrl);
		mapLibre.addProjection(equalEarthProjection);
		return mapLibre;
	});
	return mapLibreReady;
}

// --- The data -------------------------------------------------------------------

function isCountry(
	feature: MapFile["features"][number],
): feature is MapCountryFeature {
	return "iso" in feature.properties;
}

type Place = {
	type: "Feature";
	properties: {
		iso: string;
		name: string;
		marker: boolean;
		written: boolean;
		/** Which labels win when two collide: lower numbers first. */
		rank: number;
	};
	geometry: { type: "Point"; coordinates: [number, number] };
};

/** A point per country, for its label and its marker dot. */
function placesOf(
	countries: MapCountryFeature[],
	names: Readonly<Record<string, string>>,
	state: MapState,
	/** Countries whose detailed shape is on the map, and whether they still need a dot there. */
	detailedMarkers: ReadonlyMap<string, boolean>,
): { type: "FeatureCollection"; features: Place[] } {
	const written = new Set(state.written);
	return {
		type: "FeatureCollection",
		features: countries.map(({ properties }) => ({
			type: "Feature",
			properties: {
				iso: properties.iso,
				name: names[properties.iso] ?? properties.iso,
				marker:
					detailedMarkers.get(properties.iso) ?? properties.marker === true,
				written: written.has(properties.iso),
				rank: written.has(properties.iso) ? 0 : 1,
			},
			geometry: { type: "Point", coordinates: properties.label },
		})),
	};
}

function boundsOf(view: MapView, countries: MapCountryFeature[]): Bounds {
	if (view.kind === "continent") return CONTINENT_BOUNDS[view.continent];
	if (view.kind === "country") {
		const country = countries.find((each) => each.properties.iso === view.iso);
		if (country) return countryBounds(country);
	}
	return WORLD_BOUNDS;
}

// --- The map --------------------------------------------------------------------

/** The ordinary labels: every country but the selected one, with or without a marker dot. */
function labelFilter(
	marker: boolean,
	selected: string | undefined,
): ExpressionSpecification {
	return [
		"all",
		["==", ["get", "marker"], marker],
		["!=", ["get", "iso"], selected ?? ""],
	];
}

const isSelected: ExpressionSpecification = [
	"boolean",
	["feature-state", "selected"],
	false,
];
const isWritten: ExpressionSpecification = [
	"boolean",
	["feature-state", "written"],
	false,
];

export async function createMapEngine(
	options: MapEngineOptions,
): Promise<MapEngine> {
	const { container, names, onOpenCountry } = options;
	let state = options.state;

	const [world, mapLibre] = await Promise.all([
		fetch(worldUrl).then((response) => {
			if (!response.ok) throw new Error("The map data didn't load");
			return response.json() as Promise<MapFile>;
		}),
		loadMapLibre(),
		// The labels are drawn with the page's own fonts, so they must be loaded.
		document.fonts.load('12px "Montserrat"'),
		document.fonts.load('700 16px "Montserrat"'),
	]);
	const countries = world.features.filter(isCountry);
	const colours = readColours(container);

	// Every coarse shape is tagged with its continent, so a continent's coarse
	// shapes can be hidden when its detailed ones are on the map. (Neutral land
	// is tagged in the file already.)
	for (const country of countries) {
		Object.assign(country.properties, {
			continent: options.continents[country.properties.iso],
		});
	}
	const countryBoxes = countries.map((country) => ({
		continent: options.continents[country.properties.iso],
		box: flatBox(countryBounds(country)),
	}));

	/** The continents whose detailed shapes are on the map. */
	const detailed = new Set<Continent>();
	/** The continents whose coarse shapes have been taken away again. */
	const swapped = new Set<Continent>();
	const requested = new Set<Continent>();
	const detailedMarkers = new Map<string, boolean>();
	let destroyed = false;

	const stateColour = (otherwise: string): ExpressionSpecification => [
		"case",
		isSelected,
		colours.selected,
		isWritten,
		colours.written,
		otherwise,
	];

	const labelLayout = {
		"text-field": ["get", "name"] as ExpressionSpecification,
		"text-font": ["Montserrat"],
		"text-size": 12,
		"text-max-width": 8,
		"text-padding": 3,
		"symbol-sort-key": ["get", "rank"] as ExpressionSpecification,
	};
	const labelPaint = {
		"text-color": colours.label,
		"text-halo-color": colours.land,
		"text-halo-width": 3,
	};

	// Throws when the browser has no WebGL: the component shows a note instead.
	const map = new mapLibre.Map({
		container,
		// Nothing on the map needs a credit: the shapes are public domain
		// (Natural Earth) and there are no tiles (ADR 0021).
		attributionControl: false,
		// A flat map isn't turned or tilted. That comes back with the globe.
		dragRotate: false,
		pitchWithRotate: false,
		touchPitch: false,
		maxZoom: MAX_ZOOM,
		...cameraFor(boundsOf(state.view, countries), {
			width: container.clientWidth,
			height: container.clientHeight,
		}),
		// The canvas can take keyboard focus, so its name says what the keys do.
		// The region around it is named "World map" by the component.
		locale: {
			"Map.Title": "Map: arrow keys move it, plus and minus zoom",
		},
		style: {
			version: 8,
			projection: { type: equalEarthProjection.name },
			sources: {
				countries: {
					type: "geojson",
					// Our file format is GeoJSON, described with our own types.
					data: world as unknown as GeoJSONSourceSpecification["data"],
					promoteId: "iso",
				},
				places: {
					type: "geojson",
					data: placesOf(countries, names, state, detailedMarkers),
					promoteId: "iso",
				},
			},
			layers: [
				{
					id: "ocean",
					type: "background",
					paint: { "background-color": colours.ocean },
				},
				{
					id: "land",
					type: "fill",
					source: "countries",
					paint: { "fill-color": stateColour(colours.land) },
				},
				{
					id: "borders",
					type: "line",
					source: "countries",
					paint: { "line-color": colours.border, "line-width": 1 },
				},
				{
					id: "markers",
					type: "circle",
					source: "places",
					filter: ["get", "marker"],
					paint: {
						"circle-radius": 4,
						"circle-color": stateColour(colours.land),
						"circle-stroke-width": 1.5,
						"circle-stroke-color": stateColour(colours.markerOutline),
					},
				},
				// DESIGN.md, "Labels on the map": 12 px, in the text colour, with a
				// 3 px white outline so borders don't cut through the letters.
				{
					id: "labels",
					type: "symbol",
					source: "places",
					filter: labelFilter(false, state.selected),
					layout: { ...labelLayout, "text-anchor": "center" },
					paint: labelPaint,
				},
				{
					// A marker's label sits beside its dot, never on top of it.
					id: "marker-labels",
					type: "symbol",
					source: "places",
					filter: labelFilter(true, state.selected),
					layout: {
						...labelLayout,
						"text-variable-anchor": ["top", "bottom", "left", "right"],
						"text-radial-offset": 0.6,
					},
					paint: labelPaint,
				},
				{
					// The selected country: white, 16 px, bold, inside the shape.
					id: "label-selected",
					type: "symbol",
					source: "places",
					filter: ["==", ["get", "iso"], state.selected ?? ""],
					layout: {
						"text-field": ["get", "name"],
						// "Bold" in the first name is what makes MapLibre draw at 700.
						"text-font": ["Montserrat Bold", "Montserrat"],
						"text-size": 16,
						"text-max-width": 8,
						"text-allow-overlap": true,
						"text-ignore-placement": true,
					},
					paint: { "text-color": colours.labelOnSelected },
				},
			],
		},
	});
	map.touchZoomRotate.disableRotation();
	map.keyboard.disableRotation();

	const canOpen = (iso: string) => state.owner || state.written.includes(iso);

	/** The country under a point: a marker dot or a label first, then a shape. */
	function countryAt(point: MapMouseEvent["point"]): string | undefined {
		const near = map.queryRenderedFeatures(
			[
				[point.x - CLICK_REACH, point.y - CLICK_REACH],
				[point.x + CLICK_REACH, point.y + CLICK_REACH],
			],
			{ layers: ["markers"] },
		);
		const under = map.queryRenderedFeatures(point, {
			layers: [
				"label-selected",
				"marker-labels",
				"labels",
				...[...detailed].map((continent) => `detail-${continent}-land`),
				"land",
			],
		});
		const iso = [...near, ...under][0]?.properties.iso;
		return typeof iso === "string" ? iso : undefined;
	}

	map.on("click", (event) => {
		const iso = countryAt(event.point);
		if (iso && canOpen(iso)) onOpenCountry(iso);
	});
	map.on("mousemove", (event) => {
		const iso = countryAt(event.point);
		map.getCanvas().style.cursor = iso && canOpen(iso) ? "pointer" : "";
	});

	/** Colours the written and selected countries, and updates the labels. */
	function paint(previous: MapState | undefined) {
		for (const iso of new Set([
			...(previous?.written ?? []),
			...state.written,
			previous?.selected,
			state.selected,
		])) {
			if (!iso) continue;
			const featureState = {
				written: state.written.includes(iso),
				selected: iso === state.selected,
			};
			for (const source of [
				"countries",
				"places",
				...[...detailed].map((continent) => `detail-${continent}`),
			]) {
				map.setFeatureState({ source, id: iso }, featureState);
			}
		}
		if (previous) {
			(map.getSource("places") as GeoJSONSource).setData(
				placesOf(countries, names, state, detailedMarkers),
			);
		}
		const selected = state.selected ?? "";
		map.setFilter("label-selected", ["==", ["get", "iso"], selected]);
		map.setFilter("labels", labelFilter(false, state.selected));
		map.setFilter("marker-labels", labelFilter(true, state.selected));
	}

	// If the map can't start (its worker or its data fails), say so instead of
	// leaving the page waiting for ever.
	try {
		await new Promise<void>((resolve, reject) => {
			map.once("load", () => resolve());
			map.once("error", (event) => reject(event.error));
		});
	} catch (error) {
		map.remove();
		throw error;
	}
	paint(undefined);
	await map.once("idle");

	/** Puts a continent's detailed shapes on the map, in place of its coarse ones. */
	function showDetail(continent: Continent, file: MapFile) {
		const source = `detail-${continent}`;
		map.addSource(source, {
			type: "geojson",
			data: file as unknown as GeoJSONSourceSpecification["data"],
			promoteId: "iso",
		});
		// Under the marker dots and the labels, like the coarse shapes.
		map.addLayer(
			{
				id: `${source}-land`,
				type: "fill",
				source,
				paint: { "fill-color": stateColour(colours.land) },
			},
			"markers",
		);
		map.addLayer(
			{
				id: `${source}-borders`,
				type: "line",
				source,
				paint: { "line-color": colours.border, "line-width": 1 },
			},
			"markers",
		);
		detailed.add(continent);
		for (const { properties } of file.features.filter(isCountry)) {
			// A country that is a dot on the world map may be big enough here.
			detailedMarkers.set(properties.iso, properties.marker === true);
		}

		// The coarse shapes stay until the detailed ones have been drawn over
		// them. Hiding them first would leave the continent empty for a moment,
		// to the eye and to a click.
		map.once("idle", () => {
			if (destroyed) return;
			swapped.add(continent);
			const stillCoarse: ExpressionSpecification = [
				"!",
				["in", ["get", "continent"], ["literal", [...swapped]]],
			];
			map.setFilter("land", stillCoarse);
			map.setFilter("borders", stillCoarse);
		});
		// Colour the new shapes, and move the dots that are no longer needed.
		for (const iso of new Set([...state.written, state.selected])) {
			if (!iso) continue;
			map.setFeatureState(
				{ source, id: iso },
				{
					written: state.written.includes(iso),
					selected: iso === state.selected,
				},
			);
		}
		(map.getSource("places") as GeoJSONSource).setData(
			placesOf(countries, names, state, detailedMarkers),
		);
	}

	/** Fetches the detailed shapes of the continents in view, once zoomed in. */
	function loadDetailInView() {
		if (map.getZoom() < DETAIL_FROM_ZOOM) return;
		const center = map.getCenter();
		const view: FlatBox = viewBox(
			{ center: [center.lng, center.lat], zoom: map.getZoom() },
			{ width: container.clientWidth, height: container.clientHeight },
		);
		const inView = new Set(
			countryBoxes
				.filter(({ box }) => boxesOverlap(box, view))
				.map(({ continent }) => continent),
		);
		for (const continent of inView) {
			const load = detailUrls[`./geometry/${continent}.json`];
			if (!continent || !load || requested.has(continent)) continue;
			requested.add(continent);
			load()
				.then((url) => fetch(url))
				.then((response) => {
					if (!response.ok) throw new Error("A map file didn't load");
					return response.json() as Promise<MapFile>;
				})
				.then((file) => {
					if (!destroyed) showDetail(continent, file);
				})
				.catch(() => {
					// The coarse shapes stay. Try again the next time it is in view.
					requested.delete(continent);
				});
		}
	}
	map.on("moveend", loadDetailInView);
	loadDetailInView();

	return {
		update(next) {
			const previous = state;
			state = next;
			paint(previous);
			if (JSON.stringify(next.view) !== JSON.stringify(previous.view)) {
				// Jumps for now. Moving with animation, or instantly with reduced
				// motion, is M1 PR 6.
				map.jumpTo(
					cameraFor(boundsOf(next.view, countries), {
						width: container.clientWidth,
						height: container.clientHeight,
					}),
				);
			}
		},
		destroy() {
			destroyed = true;
			map.remove();
		},
	};
}
