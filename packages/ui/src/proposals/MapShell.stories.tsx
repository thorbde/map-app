import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Link } from "../components/Link/Link";
import { Panel, PanelSection } from "../components/Panel/Panel";
import { ShapeTiles } from "../components/ShapeTiles/ShapeTiles";
import { africa, continents, senegal, southAfrica } from "./content";
import { CountryBody } from "./panels";
import { Shell } from "./pieces";
import { africaShapes, continentShapes } from "./shapes";

// The three panels of the map shell (M1 PR 5), composed from the components,
// over a stand-in map. The outlines here are throwaway ones (shapes.ts); the
// real ones come from the map build (the outlines PR).

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
						href: "#",
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
						dense
						columns={4}
						items={countries.map((name) => ({
							name,
							href: "#",
							d: shape(name),
							written: written.has(name),
						}))}
					/>
				</PanelSection>
			))}
		</Panel>
	</Shell>
);

/** A continent: Africa's 55 countries as small outlines, by region. As M1 shows it: nothing written yet. */
export const Continent: Story = {
	render: () => continent("55 countries in 5 regions", new Set()),
	play: async ({ canvasElement }) => {
		const panel = within(canvasElement).getByRole("main", { name: "Africa" });
		const links = within(panel).getAllByRole("link");
		await expect(links).toHaveLength(55);
		// Every tile is a comfortable target: well over 24 px each way.
		for (const link of links) {
			const { width, height } = link.getBoundingClientRect();
			await expect(Math.min(width, height)).toBeGreaterThanOrEqual(48);
		}
	},
};

/** Four to a row with five countries written: where it leads once there are essays. */
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
