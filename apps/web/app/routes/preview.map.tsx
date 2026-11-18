import { useState } from "react";
import { useSearchParams } from "react-router";
import { type Continent, countries } from "../features/countries";
import { CountryMap, type MapView } from "../features/maps";
import type { Route } from "./+types/preview.map";
import styles from "./preview.map.module.css";

// TEMPORARY (docs/specs/m1.md, question 1): a page to look at the map and to
// test it, until the app shell arrives in M1 PR 5. It is removed then.
//
// The map is driven by the address:
//   /preview/map?view=continent:europe&written=SE,DK&selected=SE&owner=1

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

export default function MapPreview() {
	const [params] = useSearchParams();
	const [opened, setOpened] = useState<string | null>(null);

	const written = (params.get("written") ?? "")
		.split(",")
		.filter((iso) => isos.has(iso));
	const selected = params.get("selected") ?? undefined;

	return (
		<main className={styles.page}>
			<CountryMap
				view={parseView(params.get("view"))}
				written={written}
				selected={selected && isos.has(selected) ? selected : undefined}
				owner={params.get("owner") === "1"}
				onOpenCountry={setOpened}
			/>
			<div className={styles.status}>
				<h1 className={styles.title}>Map preview</h1>
				<p>
					Opened: <output>{opened ?? "nothing yet"}</output>
				</p>
			</div>
		</main>
	);
}
