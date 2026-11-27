import { MinusIcon, PlusIcon } from "@thorbde/icons";
import { IconButton } from "@thorbde/ui";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { countries } from "../../countries";
import type { MapEngine, MapState, ZoomRoom } from "../map-engine.client";
import type { MapPadding, MapView } from "../views";
import styles from "./CountryMap.module.css";

type CountryMapProps = {
	/** What the map shows: the world, a continent, or one country. */
	view: MapView;
	/** ISO codes of the written countries the viewer may see. */
	written: readonly string[];
	/** The ISO code of the selected country, if any. */
	selected?: string;
	/** The owner can open every country; a visitor only the written ones. */
	owner: boolean;
	/** Called when the viewer clicks a country they may open. */
	onOpenCountry: (iso: string) => void;
	/**
	 * How much of the map something else covers at each edge, in CSS pixels: the
	 * panel on the left, for example. Views are framed in what is left, and the
	 * zoom buttons keep clear of it.
	 */
	padding?: MapPadding;
};

/** A view as one word, for the engine's change check and for `data-view`. */
function viewName(view: MapView): string {
	if (view.kind === "continent") return `continent:${view.continent}`;
	if (view.kind === "country") return `country:${view.iso}`;
	return "world";
}

const names = Object.fromEntries(
	countries.map((country) => [country.iso, country.name]),
);

/**
 * The map (ADR 0010, ADR 0021). It loads MapLibre after the page, so the page
 * never waits for it. A map on a canvas has no links in it: whoever places this
 * also lists the countries as real links (the panel, from M1 PR 5).
 */
export function CountryMap({
	view,
	written,
	selected,
	owner,
	onOpenCountry,
	padding,
}: CountryMapProps) {
	const container = useRef<HTMLDivElement>(null);
	const engine = useRef<MapEngine | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
		"loading",
	);
	// The view the map engine was last given: what the map is showing.
	const [shown, setShown] = useState<string>();
	const [room, setRoom] = useState<ZoomRoom>({
		canZoomIn: true,
		canZoomOut: true,
	});

	// The latest props, for the engine to read when it has loaded and when the
	// viewer clicks, without setting the map up again.
	const state: MapState = { view, written, selected, owner, padding };
	const latest = useRef({ state, onOpenCountry });
	latest.current = { state, onOpenCountry };

	useEffect(() => {
		let cancelled = false;
		const element = container.current;
		if (!element) return;

		import("../map-engine.client")
			.then(({ createMapEngine }) =>
				createMapEngine({
					container: element,
					names,
					state: latest.current.state,
					onOpenCountry: (iso) => latest.current.onOpenCountry(iso),
					onZoomRoom: (next) => {
						if (!cancelled) setRoom(next);
					},
				}),
			)
			.then((created) => {
				if (cancelled) {
					created.destroy();
					return;
				}
				engine.current = created;
				// Props may have changed while the map was loading.
				created.update(latest.current.state);
				setShown(viewName(latest.current.state.view));
				setStatus("ready");
			})
			.catch(() => {
				// No WebGL, or the map's files didn't load. The page works without it.
				if (!cancelled) setStatus("unavailable");
			});

		return () => {
			cancelled = true;
			engine.current?.destroy();
			engine.current = null;
		};
	}, []);

	const viewKey = viewName(view);
	const writtenKey = written.join(",");
	const paddingKey = JSON.stringify(padding);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the keys stand in for `view`, `written` and `padding`, which are new objects on every render.
	useEffect(() => {
		if (!engine.current) return;
		engine.current.update(latest.current.state);
		setShown(viewKey);
	}, [viewKey, writtenKey, paddingKey, selected, owner]);

	// The zoom buttons sit in the bottom right corner of what isn't covered.
	const clear = {
		"--covered-bottom": `${padding?.bottom ?? 0}px`,
		"--covered-right": `${padding?.right ?? 0}px`,
	} as CSSProperties;

	return (
		<section
			className={styles.map}
			aria-label="World map"
			data-status={status}
			data-view={shown}
		>
			<div ref={container} className={styles.canvas} />
			{status === "ready" && (
				<div className={styles.zoom} style={clear}>
					<IconButton
						label="Zoom in"
						disabled={!room.canZoomIn}
						onClick={() => engine.current?.zoomIn()}
					>
						<PlusIcon />
					</IconButton>
					<IconButton
						label="Zoom out"
						disabled={!room.canZoomOut}
						onClick={() => engine.current?.zoomOut()}
					>
						<MinusIcon />
					</IconButton>
				</div>
			)}
			{status === "loading" && <p className={styles.note}>Loading the map</p>}
			{status === "unavailable" && (
				<p className={styles.note}>The map can’t be shown in this browser.</p>
			)}
		</section>
	);
}
