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
import { placesOf } from "./labels";
import type { MapCountryFeature, MapFile } from "./map-file";
import {
	cameraFor,
	type MapPadding,
	type MapView,
	viewBounds,
	WORLD_BOUNDS,
} from "./views";
import { orAfter } from "./wait";

export type MapState = {
	view: MapView;
	/** ISO codes of the written countries the viewer may see. */
	written: readonly string[];
	selected?: string;
	/** The owner can open every country; a visitor only the written ones. */
	owner: boolean;
	/** How much of the map is covered at each edge, in CSS pixels. */
	padding?: MapPadding;
	/**
	 * TEMPORARY (M1 PR 6): how the camera moves between views, for Thor to
	 * choose between on the preview page. Removed when he has.
	 */
	move?: CameraMove;
};

export type CameraMove = { how: "fly" | "ease"; ms?: number };

/** Whether the map can zoom further in each direction. */
export type ZoomRoom = { canZoomIn: boolean; canZoomOut: boolean };

export type MapEngineOptions = {
	container: HTMLElement;
	/** English country names by ISO code, for the labels. */
	names: Readonly<Record<string, string>>;
	state: MapState;
	onOpenCountry: (iso: string) => void;
	/** Called when the map reaches or leaves the end of its zoom range. */
	onZoomRoom: (room: ZoomRoom) => void;
};

export type MapEngine = {
	update: (state: MapState) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	destroy: () => void;
};

/** How long the map may take to start before the page says it can't be shown. */
const START_TIMEOUT_MS = 20_000;

/**
 * How long the started map may take to finish its first drawing before it is
 * shown as it is. It has started, so it works; it is only not at rest yet.
 */
const FIRST_DRAWING_TIMEOUT_MS = 5_000;

/**
 * How long the camera takes between two views. MapLibre makes every move
 * instant by itself when the visitor prefers reduced motion.
 */
const FLY_MS = 1_200;
const EASE_MS = 320;

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

// --- The map --------------------------------------------------------------------

/** The ordinary names: from the zoom each one shows at, and never the selected country's. */
function labelFilter(selected: string | undefined): ExpressionSpecification {
	return [
		"all",
		[">=", ["zoom"], ["get", "showFrom"]],
		["!=", ["get", "iso"], selected ?? ""],
	];
}

/** The selected country's name, at every zoom. */
function selectedFilter(selected: string | undefined): ExpressionSpecification {
	return ["==", ["get", "iso"], selected ?? ""];
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
	const { container, names, onOpenCountry, onZoomRoom } = options;
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
					data: placesOf(countries, names, state.written),
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
					filter: labelFilter(state.selected),
					layout: labelLayout,
					paint: labelPaint,
				},
				{
					// The selected country: white, 16 px, bold, inside the shape.
					id: "label-selected",
					type: "symbol",
					source: "places",
					filter: selectedFilter(state.selected),
					layout: selectedLabelLayout,
					paint: selectedLabelPaint,
				},
			],
		},
	});
	map.touchZoomRotate.disableRotation();
	map.keyboard.disableRotation();

	const viewport = () => ({
		width: container.clientWidth,
		height: container.clientHeight,
	});

	/**
	 * The furthest zoom out shows the whole world with a small margin, in the
	 * part of the map that isn't covered, and no more.
	 */
	function limitZoomOut() {
		const whole = cameraFor(
			WORLD_BOUNDS,
			viewport(),
			WORLD_MARGIN,
			state.padding,
		);
		map.setMinZoom(whole.zoom);
	}

	/**
	 * Where the camera goes for the current view. MapLibre is given the padding
	 * too: it keeps the view's centre in the middle of what isn't covered, and
	 * goes on doing so when the viewer zooms.
	 */
	function camera() {
		const { top = 0, right = 0, bottom = 0, left = 0 } = state.padding ?? {};
		return {
			...cameraFor(
				viewBounds(state.view, countries),
				viewport(),
				undefined,
				state.padding,
			),
			padding: { top, right, bottom, left },
		};
	}

	limitZoomOut();
	map.jumpTo(camera());
	map.on("resize", limitZoomOut);

	let room: ZoomRoom | undefined;
	/** Tells the page when the zoom reaches, or leaves, either end of its range. */
	function reportZoomRoom() {
		// A hair's breadth, because a zoom that has arrived is rarely exact.
		const next = {
			canZoomIn: map.getZoom() < map.getMaxZoom() - 1e-6,
			canZoomOut: map.getZoom() > map.getMinZoom() + 1e-6,
		};
		if (
			next.canZoomIn === room?.canZoomIn &&
			next.canZoomOut === room?.canZoomOut
		) {
			return;
		}
		room = next;
		onZoomRoom(next);
	}
	map.on("zoom", reportZoomRoom);
	map.on("resize", reportZoomRoom);

	// Where the camera is, written on the map's element when it starts and
	// stops moving: a map on a canvas has nothing else for a test, or a person
	// with the inspector open, to read it from.
	function noteCamera(moving: boolean) {
		const { lng, lat } = map.getCenter();
		container.dataset.moving = String(moving);
		container.dataset.zoom = map.getZoom().toFixed(3);
		container.dataset.center = `${lng.toFixed(3)},${lat.toFixed(3)}`;
	}
	map.on("movestart", () => noteCamera(true));
	map.on("moveend", () => noteCamera(false));
	noteCamera(false);

	const canOpen = (iso: string) => state.owner || state.written.includes(iso);

	/** The country under a point: its name first, then its shape. */
	function countryAt(point: MapMouseEvent["point"]): string | undefined {
		const under = map.queryRenderedFeatures(point, {
			layers: ["label-selected", "labels", "land"],
		});
		const iso = under[0]?.properties.iso;
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
				placesOf(countries, names, state.written),
			);
		}
		map.setFilter("labels", labelFilter(state.selected));
		map.setFilter("label-selected", selectedFilter(state.selected));
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

	// Wait for the first complete drawing, so the map appears whole. But not for
	// ever: if it never comes to rest, the map is shown as it is.
	await orAfter(map.once("idle"), FIRST_DRAWING_TIMEOUT_MS);
	reportZoomRoom();

	return {
		update(next) {
			const previous = state;
			state = next;
			paint(previous);
			const same = (a: unknown, b: unknown) =>
				JSON.stringify(a) === JSON.stringify(b);
			if (
				same(next.view, previous.view) &&
				same(next.padding, previous.padding)
			) {
				return;
			}
			limitZoomOut();
			// flyTo pulls back and comes in again on the way; easeTo goes straight.
			// Both are instant when the visitor prefers reduced motion.
			if (next.move?.how === "ease") {
				map.easeTo({ ...camera(), duration: next.move.ms ?? EASE_MS });
			} else {
				map.flyTo({ ...camera(), duration: next.move?.ms ?? FLY_MS });
			}
			reportZoomRoom();
		},
		zoomIn() {
			map.zoomIn();
		},
		zoomOut() {
			map.zoomOut();
		},
		destroy() {
			map.remove();
		},
	};
}
