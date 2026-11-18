import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FactBox } from "../components/FactBox/FactBox";
import { Link } from "../components/Link/Link";
import { Panel, PanelSection } from "../components/Panel/Panel";
import { africa, continents, senegal } from "./content";
import {
	FlatChips,
	IndexRows,
	RegionAccordion,
	ShapeTiles,
	Shell,
} from "./pieces";
import { africaShapes, continentShapes } from "./shapes";

// PROPOSAL (M1 PR 5), round 2: three clearly different ways to show a set of
// countries in the panel, each with the same real content. Every item is a
// real link in every version.
//   A  Index: rows with the capital beside the name; regions open and close.
//   B  Chips: the chip, flat, wrapping. Everything visible at once.
//   C  Shapes: each country's own outline, from our map file.

const shape = (name: string) => africaShapes[name]?.d ?? "";
const capital = (name: string) => africaShapes[name]?.capital;
const slug = (name: string) => name.toLowerCase().replaceAll(" ", "-");

const continentItems = continents.map(({ name, countries }) => ({
	name,
	detail: `${countries} countries`,
	d: continentShapes[slug(name)] ?? "",
}));

const neighbours = senegal.neighbours.map((name) => ({
	name,
	detail: capital(name),
	d: shape(name),
}));

const meta = {
	title: "Proposals/Lists",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const africaPanel = (title: string) =>
	within(document.body).getByRole("main", { name: title });

/** A, a continent: regions open and close; a row is the country and its capital. The first region starts open. */
export const ContinentAIndex: Story = {
	name: "Continent, A: index",
	render: () => (
		<Shell current="Africa">
			<Panel title="Africa" description="55 countries in 5 regions">
				<RegionAccordion
					open={["North Africa"]}
					regions={africa.map(({ region, countries }) => ({
						region,
						count: countries.length,
						children: (
							<IndexRows
								items={countries.map((name) => ({
									name,
									detail: capital(name),
								}))}
							/>
						),
					}))}
				/>
			</Panel>
		</Shell>
	),
	play: async () => {
		const panel = africaPanel("Africa");
		// By keyboard: open a closed region, then reach a country in it.
		const region = within(panel).getByRole("button", { name: /West Africa/ });
		region.focus();
		await userEvent.keyboard("{Enter}");
		await expect(region).toHaveAttribute("aria-expanded", "true");
		await userEvent.tab();
		await expect(
			within(panel).getByRole("link", { name: /Benin/ }),
		).toHaveFocus();
	},
};

/** B, a continent: all 55 as flat chips under their region. Nothing is hidden. */
export const ContinentBChips: Story = {
	name: "Continent, B: chips",
	render: () => (
		<Shell current="Africa">
			<Panel title="Africa" description="55 countries in 5 regions">
				{africa.map(({ region, countries }) => (
					<PanelSection key={region} title={region}>
						<FlatChips names={countries} />
					</PanelSection>
				))}
			</Panel>
		</Shell>
	),
	play: async () => {
		await expect(
			within(africaPanel("Africa")).getAllByRole("link"),
		).toHaveLength(55);
	},
};

/** C, a continent: every country as its own outline, three across. As M1 would show it: nothing written yet. */
export const ContinentCShapes: Story = {
	name: "Continent, C: shapes",
	render: () => (
		<Shell current="Africa">
			<Panel title="Africa" description="55 countries in 5 regions">
				{africa.map(({ region, countries }) => (
					<PanelSection key={region} title={region}>
						<ShapeTiles
							items={countries.map((name) => ({ name, d: shape(name) }))}
						/>
					</PanelSection>
				))}
			</Panel>
		</Shell>
	),
	play: async () => {
		await expect(
			within(africaPanel("Africa")).getAllByRole("link"),
		).toHaveLength(55);
	},
};

const written = new Set(["Morocco", "Egypt", "Senegal", "Ghana", "Nigeria"]);

/** C again, with five countries written: where the shapes lead once there are essays. The panel fills in as the map does. */
export const ContinentCShapesWritten: Story = {
	name: "Continent, C: shapes, some written",
	render: () => (
		<Shell current="Africa">
			<Panel title="Africa" description="5 of 55 countries written">
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
	),
};

/** A, the world: a row per continent with its count. */
export const WorldAIndex: Story = {
	name: "World, A: index",
	render: () => (
		<Shell current="World">
			<Panel title="The world" description="200 countries">
				<IndexRows items={continentItems} />
			</Panel>
		</Shell>
	),
};

/** C, the world: the six continents as their outlines. */
export const WorldCShapes: Story = {
	name: "World, C: shapes",
	render: () => (
		<Shell current="World">
			<Panel title="The world" description="200 countries">
				<ShapeTiles items={continentItems} />
			</Panel>
		</Shell>
	),
};

const countryPanel = (list: React.ReactNode) => (
	<Shell current="Africa">
		<Panel title="Senegal" description="West Africa, Africa">
			<FactBox facts={senegal.facts} />
			<PanelSection title="Neighbours">{list}</PanelSection>
			<p>
				<Link href="#">← All of Africa</Link>
			</p>
		</Panel>
	</Shell>
);

/** A, a country's neighbours: rows with capitals. */
export const NeighboursAIndex: Story = {
	name: "Neighbours, A: index",
	render: () => countryPanel(<IndexRows items={neighbours} />),
};

/** B, a country's neighbours: flat chips. */
export const NeighboursBChips: Story = {
	name: "Neighbours, B: chips",
	render: () => countryPanel(<FlatChips names={senegal.neighbours} />),
};

/** C, a country's neighbours: outlines. */
export const NeighboursCShapes: Story = {
	name: "Neighbours, C: shapes",
	render: () =>
		countryPanel(
			<ShapeTiles
				items={neighbours.map(({ name, d }) => ({ name, d }))}
				columns={4}
			/>,
		),
};
