import { data } from "react-router";
import { ContinentPanel } from "../features/countries";
import {
	continentPanel,
	continentSchema,
} from "../features/countries/index.server";
import type { MapView } from "../features/maps";
import { countryOutlines } from "../features/maps/index.server";
import type { Route } from "./+types/preview.continent";
import { previewPaths } from "./preview.paths";

export function loader({ params }: Route.LoaderArgs) {
	const continent = continentSchema.safeParse(params.continent);
	if (!continent.success) throw data(null, { status: 404 });
	const view: MapView = { kind: "continent", continent: continent.data };
	return {
		panel: continentPanel(continent.data),
		outlines: countryOutlines(continent.data),
		view,
	};
}

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: `${loaderData?.panel.name ?? "Not found"}: map preview` },
		{ name: "robots", content: "noindex" },
	];
}

export default function PreviewContinent({ loaderData }: Route.ComponentProps) {
	return (
		<ContinentPanel
			key={loaderData.panel.id}
			panel={loaderData.panel}
			outlines={loaderData.outlines}
			paths={previewPaths}
		/>
	);
}
