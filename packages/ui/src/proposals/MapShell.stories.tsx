import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Link } from "../components/Link/Link";
import { Panel, PanelSection } from "../components/Panel/Panel";
import { africa, continents, senegal, southAfrica } from "./content";
import { CountryBody } from "./panels";
import { ShapeTiles, Shell } from "./pieces";
import { africaShapes, continentShapes } from "./shapes";

// The three panels of the map shell (M1 PR 5), composed from the components,
// over a stand-in map. The shape tiles on the world and continent panels are
// Thor's choice (2026-11-18) and still a proposal piece: they become a real
// component when the outlines have a build step.

const shape = (name: string) => africaShapes[name]?.d ?? "";
const slug = (name: string) => name.toLowerCase().replaceAll(" ", "-");

const meta = {
	title: "Proposals/Map shell",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The world: the six continents as their outlines. */
export const World: Story = {
	render: () => (
		<Shell current="World">
			<Panel title="The world" description="200 countries">
				<ShapeTiles
					items={continents.map(({ name, countries }) => ({
						name,
						detail: `${countries} countries`,
						d: continentShapes[slug(name)] ?? "",
					}))}
				/>
			</Panel>
		</Shell>
	),
};

const continent = (description: string, written: ReadonlySet<string>) => (
	<Shell current="Africa">
		<Panel title="Africa" description={description}>
			{africa.map(({ region, countries }) => (
				<PanelSection key={region} title={region}>
					<ShapeTiles
						items={countries.map((name) => ({
							name,
							d: shape(name),
							written: written.has(name),
						}))}
					/>
				</PanelSection>
			))}
		</Panel>
	</Shell>
);

/** A continent: Africa's 55 countries as their outlines, by region. As M1 shows it: nothing written yet. */
export const Continent: Story = {
	render: () => continent("55 countries in 5 regions", new Set()),
	play: async ({ canvasElement }) => {
		const panel = within(canvasElement).getByRole("main", { name: "Africa" });
		await expect(within(panel).getAllByRole("link")).toHaveLength(55);
	},
};

/** The same with five countries written: where it leads once there are essays. */
export const ContinentSomeWritten: Story = {
	name: "Continent, some written",
	render: () =>
		continent(
			"5 of 55 countries written",
			new Set(["Morocco", "Egypt", "Senegal", "Ghana", "Nigeria"]),
		),
};

const country = (which: typeof senegal | typeof southAfrica) => (
	<Shell current="Africa">
		<Panel title={which.name} description={`${which.region}, Africa`}>
			<CountryBody country={which} />
			<p>
				<Link href="#">← All of Africa</Link>
			</p>
		</Panel>
	</Shell>
);

/** A country: Senegal. Neighbours are small tags that are links. */
export const Country: Story = {
	render: () => country(senegal),
};

/** A country with long values: South Africa. Capitals and languages are tags, three then "N more". */
export const CountryWithLongValues: Story = {
	name: "Country with long values",
	render: () => country(southAfrica),
};
