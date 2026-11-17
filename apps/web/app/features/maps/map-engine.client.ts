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
import { equalEarthProjection } from "./equal-earth";
import equalEarthWorkerUrl from "./equal-earth.worker?worker&url";
import worldUrl from "./geometry/world.json?url";
import type { MapCountryFeature, MapFile } from "./map-file";
import {
	type Bounds,
	CONTINENT_BOUNDS,
	cameraFor,
	countryBounds,
	type MapView,
	WORLD_BOUNDS,
} from "./views";

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
	state: MapState;
	onOpenCountry: (iso: string) => void;
};

export type MapEngine = {
	update: (state: MapState) => void;
	destroy: () => void;
};

/** How long the map may take to start before the page says it can't be shown. */
const START_TIMEOUT_MS = 20_000;

/**
 * A country gets a marker dot while its largest piece of land is fewer than
 * this many pixels across, at the zoom the viewer is at.
 */
const MARKER_BELOW_PX = 6;

/** How far from a marker dot a click still counts, in pixels. */
const CLICK_REACH = 6;

/** The closest the camera gets: close enough to look at a city. */
const MAX_ZOOM = 12;

/** How much room is left around the whole world at the furthest zoom out, in pixels. */
const WORLD_MARGIN = 24;

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
		/** The country has a marker dot at zooms below this one. */
		markerUntilZoom: number;
		written: boolean;
		/** Which labels win when two collide: lower numbers first. */
		rank: number;
	};
	geometry: { type: "Point"; coordinates: [number, number] };
};

/** The zoom at which something this many kilometres across is this many pixels across. */
function zoomWhereAcross(km: number, pixels: number): number {
	// MapLibre draws the world square 512 px wide at zoom 0.
	const kmAcrossWorld = equalEarthProjection.tileMatrixSet.extentAtZoom0 / 1000;
	return Math.log2((pixels * kmAcrossWorld) / (512 * km));
}

/** A point per country, for its label and its marker dot. */
function placesOf(
	countries: MapCountryFeature[],
	names: Readonly<Record<string, string>>,
	state: MapState,
): { type: "FeatureCollection"; features: Place[] } {
	const written = new Set(state.written);
	return {
		type: "FeatureCollection",
		features: countries.map(({ properties }) => ({
			type: "Feature",
			properties: {
				iso: properties.iso,
				name: names[properties.iso] ?? properties.iso,
				markerUntilZoom: zoomWhereAcross(properties.sizeKm, MARKER_BELOW_PX),
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

/** Is the country still a marker dot at the zoom the viewer is at? MapLibre re-checks as they zoom. */
const isMarker: ExpressionSpecification = [
	">",
	["get", "markerUntilZoom"],
	["zoom"],
];

/** The ordinary labels: every country but the selected one, with or without a marker dot. */
function labelFilter(
	marker: boolean,
	selected: string | undefined,
): ExpressionSpecification {
	return [
		"all",
		marker ? isMarker : ["!", isMarker],
		["!=", ["get", "iso"], selected ?? ""],
	];
}

/** The selected country's label: one layer for when it is a shape, one for when it is a dot. */
function selectedFilter(
	marker: boolean,
	selected: string | undefined,
): ExpressionSpecification {
	return [
		"all",
		marker ? isMarker : ["!", isMarker],
		["==", ["get", "iso"], selected ?? ""],
	];
}

/** A marker dot as a picture, for MapLibre to place like a label. */
function dotImage(fill: string, outline: string) {
	const RADIUS = 4;
	const OUTLINE = 1.5;
	const pixelRatio = 2;
	const size = Math.ceil((RADIUS + OUTLINE) * 2 + 2) * pixelRatio;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("No canvas to draw the marker dots on");
	context.beginPath();
	context.arc(size / 2, size / 2, RADIUS * pixelRatio, 0, 2 * Math.PI);
	context.fillStyle = fill;
	context.fill();
	context.lineWidth = OUTLINE * pixelRatio;
	context.strokeStyle = outline;
	context.stroke();
	return { image: context.getImageData(0, 0, size, size), pixelRatio };
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

	const selectedLabelLayout = {
		"text-field": ["get", "name"] as ExpressionSpecification,
		// "Bold" in the first name is what makes MapLibre draw at 700.
		"text-font": ["Montserrat Bold", "Montserrat"],
		"text-size": 16,
		"text-max-width": 8,
		// Always drawn, and the other labels make room for it.
		"text-allow-overlap": true,
	};
	const selectedLabelPaint = {
		"text-color": colours.labelOnSelected,
		// Where the name is wider than the country, the letters that reach over a
		// neighbour or the sea keep a dark edge to stand on.
		"text-halo-color": colours.selected,
		"text-halo-width": 2,
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
					data: placesOf(countries, names, state),
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
					// The selected country: white, 16 px, bold, inside the shape.
					id: "label-selected",
					type: "symbol",
					source: "places",
					filter: selectedFilter(false, state.selected),
					layout: selectedLabelLayout,
					paint: selectedLabelPaint,
				},
			],
		},
	});
	map.touchZoomRotate.disableRotation();
	map.keyboard.disableRotation();

	/** The furthest zoom out shows the whole world with a small margin, and no more. */
	function limitZoomOut() {
		const whole = cameraFor(
			WORLD_BOUNDS,
			{ width: container.clientWidth, height: container.clientHeight },
			WORLD_MARGIN,
		);
		map.setMinZoom(whole.zoom);
	}
	limitZoomOut();
	map.on("resize", limitZoomOut);

	const canOpen = (iso: string) => state.owner || state.written.includes(iso);

	/** The country under a point: a marker dot or a label first, then a shape. */
	function countryAt(point: MapMouseEvent["point"]): string | undefined {
		const near = map.queryRenderedFeatures(
			[
				[point.x - CLICK_REACH, point.y - CLICK_REACH],
				[point.x + CLICK_REACH, point.y + CLICK_REACH],
			],
			{ layers: ["marker-selected", "markers"] },
		);
		const under = map.queryRenderedFeatures(point, {
			layers: ["label-selected", "labels", "land"],
		});
		const iso = [...near, ...under][0]?.properties.iso;
		return typeof iso === "string" ? iso : undefined;
	}

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
			map.setFeatureState({ source: "countries", id: iso }, featureState);
			map.setFeatureState({ source: "places", id: iso }, featureState);
		}
		if (previous) {
			(map.getSource("places") as GeoJSONSource).setData(
				placesOf(countries, names, state),
			);
		}
		map.setFilter("labels", labelFilter(false, state.selected));
		map.setFilter("markers", labelFilter(true, state.selected));
		map.setFilter("label-selected", selectedFilter(false, state.selected));
		map.setFilter("marker-selected", selectedFilter(true, state.selected));
	}

	// If the map hasn't started after a while (its worker or its style failed),
	// say so instead of leaving the page waiting for ever. A single error event
	// is not taken as failure: MapLibre reports many things that way that it
	// carries on from.
	try {
		await new Promise<void>((resolve, reject) => {
			const giveUp = setTimeout(
				() => reject(new Error("The map didn't start")),
				START_TIMEOUT_MS,
			);
			map.once("load", () => {
				clearTimeout(giveUp);
				resolve();
			});
		});
	} catch (error) {
		map.remove();
		throw error;
	}

	// The marker dots. Each dot and its name are one symbol, which MapLibre
	// places like any label: where dots would overlap, one gives way, and comes
	// back when the viewer zooms in and there is room. Written countries go first.
	const dots = {
		dot: dotImage(colours.land, colours.markerOutline),
		"dot-written": dotImage(colours.written, colours.written),
		"dot-selected": dotImage(colours.selected, colours.selected),
	};
	for (const [name, { image, pixelRatio }] of Object.entries(dots)) {
		map.addImage(name, image, { pixelRatio });
	}
	const beside = {
		// A marker's name sits beside its dot, never on top of it.
		"text-variable-anchor": ["top", "bottom", "left", "right"] as [
			"top",
			"bottom",
			"left",
			"right",
		],
		"text-radial-offset": 0.6,
	};
	map.addLayer(
		{
			id: "markers",
			type: "symbol",
			source: "places",
			filter: labelFilter(true, state.selected),
			layout: {
				...labelLayout,
				...beside,
				"icon-image": ["case", ["get", "written"], "dot-written", "dot"],
				// The dot is what makes a small country clickable, so it stays
				// when only its name doesn't fit.
				"text-optional": true,
			},
			paint: labelPaint,
		},
		"label-selected",
	);
	map.addLayer({
		id: "marker-selected",
		type: "symbol",
		source: "places",
		filter: selectedFilter(true, state.selected),
		layout: {
			...selectedLabelLayout,
			...beside,
			"icon-image": "dot-selected",
			"icon-allow-overlap": true,
		},
		paint: selectedLabelPaint,
	});
	paint(undefined);

	// Only now does the map listen to the mouse: before the style has loaded
	// there are no layers to ask about.
	map.on("click", (event) => {
		const iso = countryAt(event.point);
		if (iso && canOpen(iso)) onOpenCountry(iso);
	});
	map.on("mousemove", (event) => {
		const iso = countryAt(event.point);
		map.getCanvas().style.cursor = iso && canOpen(iso) ? "pointer" : "";
	});

	await map.once("idle");

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
			map.remove();
		},
	};
}
