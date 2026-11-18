import { Panel } from "@thorbde/ui";
import type { PanelPaths, WorldPanelData } from "../panel-types";
import { PlaceList } from "./PlaceList";

/** The world: the six continents, each with its number of countries. */
export function WorldPanel({
	panel,
	paths,
}: {
	panel: WorldPanelData;
	paths: PanelPaths;
}) {
	return (
		<Panel title="The world" description={`${panel.countryCount} countries`}>
			<PlaceList
				items={panel.continents.map(({ id, name, countryCount }) => ({
					id,
					name,
					detail: `${countryCount} countries`,
					to: paths.continent(id),
				}))}
			/>
		</Panel>
	);
}
