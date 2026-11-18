import { data } from "react-router";
import { CountryPanel } from "../features/countries";
import { countryPanel, isoSchema } from "../features/countries/index.server";
import type { MapView } from "../features/maps";
import type { Route } from "./+types/preview.country";
import { previewPaths } from "./preview.paths";

export function loader({ params }: Route.LoaderArgs) {
	const iso = isoSchema.safeParse(params.iso);
	if (!iso.success) throw data(null, { status: 404 });
	const view: MapView = { kind: "country", iso: iso.data };
	return { panel: countryPanel(iso.data), view };
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: `${loaderData?.panel.name ?? "Not found"}: map preview` },
		{ name: "robots", content: "noindex" },
	];
}

export default function PreviewCountry({ loaderData }: Route.ComponentProps) {
	// A new country is a new panel: "9 more" doesn't stay open from the last one.
	return (
		<CountryPanel
			key={loaderData.panel.iso}
			panel={loaderData.panel}
			paths={previewPaths}
		/>
	);
}
