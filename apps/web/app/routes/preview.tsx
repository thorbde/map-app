import { Chip, Chips } from "@thorbde/ui";
import { useEffect, useRef, useState } from "react";
import {
	Outlet,
	Link as RouterLink,
	useLocation,
	useMatches,
	useNavigate,
} from "react-router";
import { type Continent, continents, countries } from "../features/countries";
import { CountryMap, type MapView } from "../features/maps";
import styles from "./preview.module.css";
import { previewPaths } from "./preview.paths";

// The map shell (ADR 0010): the map and the continent chips stay mounted, and
// each child route renders only its panel. TEMPORARY in one way: it lives under
// /preview, with everyone counted as the owner and nothing written, until
// accounts and profiles arrive (docs/specs/m1.md, question 1).

const continentIds = Object.keys(continents) as Continent[];
const continentOf = new Map(
	countries.map((country) => [country.iso, country.continent]),
);

export default function PreviewShell() {
	const navigate = useNavigate();
	const { pathname } = useLocation();

	// Every child route's loader says what the map shows for its address.
	const leaf = useMatches().at(-1)?.loaderData as
		| { view?: MapView }
		| undefined;
	const view: MapView = leaf?.view ?? { kind: "world" };
	const selected = view.kind === "country" ? view.iso : undefined;
	const continent =
		view.kind === "continent"
			? view.continent
			: selected && continentOf.get(selected);

	// After a link is followed, keyboard focus moves to the new panel's heading,
	// so a screen reader says where it is and Tab carries on from there. A
	// country opened from the map leaves focus on the map.
	const panel = useRef<HTMLDivElement>(null);
	const map = useRef<HTMLDivElement>(null);
	const firstPage = useRef(pathname);
	useEffect(() => {
		if (firstPage.current === pathname) return;
		firstPage.current = "";
		if (map.current?.contains(document.activeElement)) return;
		const heading = panel.current?.querySelector("h1");
		if (!heading) return;
		heading.tabIndex = -1;
		heading.focus();
	}, [pathname]);

	// How much of the map the panel covers on the left and the chips at the
	// top, in pixels: the tokens' lengths (`.covered` in the CSS) as the browser
	// measures them, also after the text size changes.
	const measure = useRef<HTMLDivElement>(null);
	const [covered, setCovered] = useState<{ left: number; top: number }>();
	useEffect(() => {
		const element = measure.current;
		if (!element) return;
		const observer = new ResizeObserver(() =>
			setCovered({ left: element.offsetWidth, top: element.offsetHeight }),
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div className={styles.shell}>
			<div ref={measure} className={styles.covered} />
			<div ref={panel} className={styles.panel}>
				<Outlet />
			</div>
			<Chips label="Continents" className={styles.chips}>
				<Chip
					render={<RouterLink to={previewPaths.world} />}
					current={view.kind === "world"}
				>
					World
				</Chip>
				{continentIds.map((id) => (
					<Chip
						key={id}
						render={<RouterLink to={previewPaths.continent(id)} />}
						current={id === continent}
					>
						{continents[id].name}
					</Chip>
				))}
			</Chips>
			<div ref={map}>
				<CountryMap
					view={view}
					written={[]}
					selected={selected}
					owner
					onOpenCountry={(iso) => navigate(previewPaths.country(iso))}
					padding={covered}
				/>
			</div>
		</div>
	);
}
