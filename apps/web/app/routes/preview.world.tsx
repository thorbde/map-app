import { WorldPanel } from "../features/countries";
import { worldPanel } from "../features/countries/index.server";
import type { MapView } from "../features/maps";
import type { Route } from "./+types/preview.world";
import { previewPaths } from "./preview.paths";

export function loader(_: Route.LoaderArgs) {
	const view: MapView = { kind: "world" };
	return { panel: worldPanel(), view };
}

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "The world: map preview" },
		{ name: "robots", content: "noindex" },
	];
}

export default function PreviewWorld({ loaderData }: Route.ComponentProps) {
	return <WorldPanel panel={loaderData.panel} paths={previewPaths} />;
}
