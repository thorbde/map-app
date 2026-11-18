import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Chip, Chips } from "../components/Chips/Chips";
import { FactBox } from "../components/FactBox/FactBox";
import { Link } from "../components/Link/Link";
import { Panel, PanelSection } from "../components/Panel/Panel";
import {
	africa,
	chipNames,
	continents,
	FakeMap,
	linkList,
	senegal,
	southAfrica,
} from "./content";

// PROPOSAL (M1 PR 5), awaiting Thor's review: the panel and the continent chips
// together, over the map's colours, with real content. The map is a stand-in
// of flat blocks. The layout here (panel top left, chips beside it) is what the
// shell would do; it is part of the proposal, not of the components.

const panelPlace: CSSProperties = {
	position: "absolute",
	inset: "var(--space-4) auto var(--space-4) var(--space-4)",
	display: "flex",
	alignItems: "flex-start",
};
const chipsPlace: CSSProperties = {
	position: "absolute",
	inset:
		"var(--space-4) var(--space-4) auto calc(var(--size-panel) + 2 * var(--space-4))",
};

function Shell({
	current,
	hairline,
	children,
}: {
	current: string;
	hairline?: boolean;
	children: (edge: CSSProperties | undefined) => ReactNode;
}) {
	const edge = hairline
		? { border: "1px solid var(--color-border-default)" }
		: undefined;
	return (
		<FakeMap>
			<div style={panelPlace}>{children(edge)}</div>
			<Chips label="Continents" style={chipsPlace}>
				{chipNames.map((name) => (
					<Chip key={name} href="#" current={name === current} style={edge}>
						{name}
					</Chip>
				))}
			</Chips>
		</FakeMap>
	);
}

const links = (names: readonly string[]) => (
	<ul style={linkList}>
		{names.map((name) => (
			<li key={name}>
				<Link href="#">{name}</Link>
			</li>
		))}
	</ul>
);

function CountryPanel({
	country,
	style,
}: {
	country: typeof senegal;
	style?: CSSProperties;
}) {
	return (
		<Panel
			title={country.name}
			description={`${country.region}, Africa`}
			style={style}
		>
			<FactBox facts={country.facts} />
			<PanelSection title="Neighbours">
				{links(country.neighbours)}
			</PanelSection>
			<p>
				<Link href="#">← All of Africa</Link>
			</p>
		</Panel>
	);
}

const meta = {
	title: "Proposals/Map shell",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The world: the six continents as links, with how many countries each has. */
export const World: Story = {
	render: () => (
		<Shell current="World">
			{(edge) => (
				<Panel title="The world" description="200 countries" style={edge}>
					<PanelSection title="Continents">
						<ul style={linkList}>
							{continents.map(({ name, countries }) => (
								<li key={name}>
									<Link href="#">{name}</Link>
									{`, ${countries} countries`}
								</li>
							))}
						</ul>
					</PanelSection>
				</Panel>
			)}
		</Shell>
	),
};

/** A continent: Africa's 55 countries by region. The panel is as tall as the window and its body scrolls. */
export const Continent: Story = {
	render: () => (
		<Shell current="Africa">
			{(edge) => (
				<Panel title="Africa" description="55 countries" style={edge}>
					{africa.map(({ region, countries }) => (
						<PanelSection key={region} title={region}>
							{links(countries)}
						</PanelSection>
					))}
				</Panel>
			)}
		</Shell>
	),
	play: async ({ canvasElement }) => {
		const panel = within(canvasElement).getByRole("main", { name: "Africa" });
		await expect(within(panel).getAllByRole("link")).toHaveLength(55);
	},
};

/** A country: Senegal, with its fact box and neighbours. */
export const Country: Story = {
	render: () => (
		<Shell current="Africa">
			{(edge) => <CountryPanel country={senegal} style={edge} />}
		</Shell>
	),
};

/** A country with long values: South Africa. */
export const CountryWithLongValues: Story = {
	render: () => (
		<Shell current="Africa">
			{(edge) => <CountryPanel country={southAfrica} style={edge} />}
		</Shell>
	),
};

/** The country page again, with a hairline edge on the panel and the chips. Compare with "Country". */
export const CountryWithHairline: Story = {
	render: () => (
		<Shell current="Africa" hairline>
			{(edge) => <CountryPanel country={senegal} style={edge} />}
		</Shell>
	),
};
