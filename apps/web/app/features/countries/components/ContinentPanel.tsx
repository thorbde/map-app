import { Panel, PanelSection } from "@thorbde/ui";
import type { ContinentPanelData, PanelPaths } from "../panel-types";
import { PlaceList } from "./PlaceList";

/** A continent: every one of its countries, grouped by region. */
export function ContinentPanel({
	panel,
	paths,
}: {
	panel: ContinentPanelData;
	paths: PanelPaths;
}) {
	const lists = panel.regions.map((region) => ({
		...region,
		list: (
			<PlaceList
				items={region.countries.map(({ iso, name }) => ({
					id: iso,
					name,
					to: paths.country(iso),
				}))}
			/>
		),
	}));
	const [only] = lists;
	return (
		<Panel
			title={panel.name}
			description={
				lists.length > 1
					? `${panel.countryCount} countries in ${lists.length} regions`
					: `${panel.countryCount} countries`
			}
		>
			{/* South America is one region with the continent's own name: no heading. */}
			{lists.length === 1 && only
				? only.list
				: lists.map(({ id, name, list }) => (
						<PanelSection key={id} id={id} title={name}>
							{list}
						</PanelSection>
					))}
		</Panel>
	);
}
