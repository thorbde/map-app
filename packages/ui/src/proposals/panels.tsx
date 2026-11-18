import { FactBox } from "../components/FactBox/FactBox";
import { PanelSection } from "../components/Panel/Panel";
import { Tag, TagLink, TagList } from "../components/Tag/Tag";
import type { senegal, southAfrica } from "./content";

// Stories only: a country panel's body, as the shell would compose it from the
// real components. Several values of one fact are tags, three then "N more";
// neighbours are tags that are links.

const tags = (values: readonly string[]) => (
	<TagList limit={3}>
		{values.map((value) => (
			<Tag key={value}>{value}</Tag>
		))}
	</TagList>
);

export function CountryBody({
	country,
}: {
	country: typeof senegal | typeof southAfrica;
}) {
	const facts =
		"capitals" in country
			? [
					{ label: "Capitals", value: tags(country.capitals) },
					{ label: "Languages", value: tags(country.languages) },
					...country.facts,
				]
			: country.facts;
	return (
		<>
			<FactBox facts={facts} />
			<PanelSection title="Neighbours">
				<TagList>
					{country.neighbours.map((name) => (
						<TagLink key={name} href="#">
							{name}
						</TagLink>
					))}
				</TagList>
			</PanelSection>
		</>
	);
}
