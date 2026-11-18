import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { type Continent, countries } from "../features/countries";
import { CountryMap, type MapView } from "../features/maps";
import type { Route } from "./+types/preview.map";
import styles from "./preview.map.module.css";

// TEMPORARY (docs/specs/m1.md, question 1): a page to look at the map and to
// test it, until the app shell arrives in M1 PR 5. It is removed then.
//
// The map is driven by the address:
//   /preview/map?view=continent:europe&written=SE,DK&selected=SE&owner=1
//
//   &panel=416   frames views as if something that wide covered the left of the map

export function meta(_: Route.MetaArgs) {
	return [{ title: "Map preview" }, { name: "robots", content: "noindex" }];
}

const isos = new Set(countries.map((country) => country.iso));
const continents = new Set<string>(
	countries.map((country) => country.continent),
);

function parseView(value: string | null): MapView {
	const [kind, id = ""] = (value ?? "").split(":");
	if (kind === "continent" && continents.has(id)) {
		return { kind, continent: id as Continent };
	}
	if (kind === "country" && isos.has(id)) return { kind, iso: id };
	return { kind: "world" };
}

// Views to move between, so the camera's flight can be looked at and tested
// before the shell's own links exist.
const places = [
	["World", "world"],
	["Europe", "continent:europe"],
	["Africa", "continent:africa"],
	["Oceania", "continent:oceania"],
	["Sweden", "country:SE"],
	["Denmark", "country:DK"],
	["Kenya", "country:KE"],
	["Brazil", "country:BR"],
] as const;

export default function MapPreview() {
	const [params] = useSearchParams();
	const [opened, setOpened] = useState<string | null>(null);

	const written = (params.get("written") ?? "")
		.split(",")
		.filter((iso) => isos.has(iso));
	const selected = params.get("selected") ?? undefined;
	const panel = Number(params.get("panel"));

	return (
		<main className={styles.page}>
			<CountryMap
				view={parseView(params.get("view"))}
				written={written}
				selected={selected && isos.has(selected) ? selected : undefined}
				owner={params.get("owner") === "1"}
				onOpenCountry={setOpened}
				padding={panel > 0 ? { left: panel } : undefined}
			/>
			<div className={styles.status}>
				<h1 className={styles.title}>Map preview</h1>
				<p>
					Opened: <output>{opened ?? "nothing yet"}</output>
				</p>
				<ul className={styles.places}>
					{places.map(([name, view]) => {
						const to = new URLSearchParams(params);
						to.set("view", view);
						return (
							<li key={view}>
								<Link to={`?${to}`}>{name}</Link>
							</li>
						);
					})}
				</ul>
			</div>
		</main>
	);
}
