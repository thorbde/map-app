import { useEffect, useRef, useState } from "react";
import { countries } from "../../countries";
import type { MapEngine, MapState } from "../map-engine.client";
import type { MapView } from "../views";
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
};

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
}: CountryMapProps) {
	const container = useRef<HTMLDivElement>(null);
	const engine = useRef<MapEngine | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
		"loading",
	);

	// The latest props, for the engine to read when it has loaded and when the
	// viewer clicks, without setting the map up again.
	const state: MapState = { view, written, selected, owner };
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

	const viewKey = JSON.stringify(view);
	const writtenKey = written.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: the keys stand in for `view` and `written`, which are new objects on every render.
	useEffect(() => {
		engine.current?.update(latest.current.state);
	}, [viewKey, writtenKey, selected, owner]);

	return (
		<section className={styles.map} aria-label="World map" data-status={status}>
			<div ref={container} className={styles.canvas} />
			{status === "loading" && <p className={styles.note}>Loading the map</p>}
			{status === "unavailable" && (
				<p className={styles.note}>The map can’t be shown in this browser.</p>
			)}
		</section>
	);
}
