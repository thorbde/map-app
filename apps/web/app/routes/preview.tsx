import { Chip, CollapsingChips } from "@thorbde/ui";
import { useEffect, useRef } from "react";
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

const WORLD = "World";

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

	return (
		<div className={styles.shell}>
			<div ref={panel} className={styles.panel}>
				<Outlet />
			</div>
			{/* The continent control collapses into the current view's chip
			    (DESIGN.md); the others are links that slide out beside it. */}
			<CollapsingChips
				label="Continents"
				className={styles.chips}
				current={continent ? continents[continent].name : WORLD}
			>
				{continent && (
					<Chip render={<RouterLink to={previewPaths.world} />}>{WORLD}</Chip>
				)}
				{continentIds
					.filter((id) => id !== continent)
					.map((id) => (
						<Chip
							key={id}
							render={<RouterLink to={previewPaths.continent(id)} />}
						>
							{continents[id].name}
						</Chip>
					))}
			</CollapsingChips>
			<div ref={map}>
				<CountryMap
					view={view}
					written={[]}
					selected={selected}
					owner
					onOpenCountry={(iso) => navigate(previewPaths.country(iso))}
					// TO COME WITH M1 PR 6: `padding={{ left: … }}`, the panel's
					// width (`size.panel`) and the gap on each side of it, so the
					// camera keeps clear of the panel. Until then the map's view
					// sits partly under it.
				/>
			</div>
		</div>
	);
}
