import {
	FactBox,
	Link,
	Panel,
	PanelSection,
	Tag,
	TagLink,
	TagList,
} from "@thorbde/ui";
import { Link as RouterLink } from "react-router";
import type { CountryPanelData, PanelPaths } from "../panel-types";
import styles from "./CountryPanel.module.css";

/** Several values of one fact are tags, three and then "N more" (DESIGN.md). */
const SHOWN_VALUES = 3;

/** A country: where it is, its fact box, and its neighbours as links. */
export function CountryPanel({
	panel,
	paths,
}: {
	panel: CountryPanelData;
	paths: PanelPaths;
}) {
	const { continent, region } = panel;
	const toContinent = paths.continent(continent.id);
	return (
		<Panel
			title={panel.name}
			description={
				// A continent that is one region with its own name is named once.
				region.name === continent.name ? (
					<RouterLink className={styles.onHeader} to={toContinent}>
						{continent.name}
					</RouterLink>
				) : (
					<>
						<RouterLink
							className={styles.onHeader}
							to={paths.continent(continent.id, region.id)}
						>
							{region.name}
						</RouterLink>
						{", "}
						<RouterLink className={styles.onHeader} to={toContinent}>
							{continent.name}
						</RouterLink>
					</>
				)
			}
		>
			<FactBox
				facts={panel.facts.map(({ label, values }) => ({
					label,
					value:
						values.length > 1 ? (
							<TagList limit={SHOWN_VALUES}>
								{values.map((value) => (
									<Tag key={value}>{value}</Tag>
								))}
							</TagList>
						) : (
							values[0]
						),
				}))}
			/>
			<PanelSection title="Neighbours">
				{panel.neighbours.length > 0 ? (
					<TagList>
						{panel.neighbours.map(({ iso, name }) => (
							<TagLink
								key={iso}
								render={<RouterLink to={paths.country(iso)} />}
							>
								{name}
							</TagLink>
						))}
					</TagList>
				) : (
					<p>{panel.name} has no land borders.</p>
				)}
			</PanelSection>
			<p>
				<Link render={<RouterLink to={toContinent} />}>
					← All of {continent.name}
				</Link>
			</p>
		</Panel>
	);
}
