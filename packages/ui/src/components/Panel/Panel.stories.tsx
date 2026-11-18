import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { expect, within } from "storybook/test";
import { africa, linkList, senegal } from "../../proposals/content";
import { FactBox } from "../FactBox/FactBox";
import { Link } from "../Link/Link";
import { Panel, PanelSection } from "./Panel";

// PROPOSAL (M1 PR 5), awaiting Thor's review.

const onOcean: CSSProperties = {
	boxSizing: "border-box",
	padding: "var(--space-4)",
	background: "var(--color-map-ocean)",
};

const countryBody = (
	<>
		<FactBox facts={senegal.facts} />
		<PanelSection title="Neighbours">
			<ul style={linkList}>
				{senegal.neighbours.map((name) => (
					<li key={name}>
						<Link href="#">{name}</Link>
					</li>
				))}
			</ul>
		</PanelSection>
	</>
);

const africaBody = africa.map(({ region, countries }) => (
	<PanelSection key={region} title={region}>
		<ul style={linkList}>
			{countries.map((name) => (
				<li key={name}>
					<Link href="#">{name}</Link>
				</li>
			))}
		</ul>
	</PanelSection>
));

const meta = {
	title: "Components/Panel",
	component: Panel,
	args: {
		title: "Senegal",
		description: "West Africa, Africa",
		children: countryBody,
	},
	decorators: [(Story) => <div style={onOcean}>{Story()}</div>],
} satisfies Meta<typeof Panel>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A short panel: a title, the line under it, a fact box and one section. */
export const Short: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getByRole("main", { name: "Senegal" }),
		).toBeInTheDocument();
		await expect(
			canvas.getByRole("region", { name: "Neighbours" }),
		).toBeInTheDocument();
	},
};

/** No line under the title. */
export const WithoutDescription: Story = {
	args: { title: "The world", description: undefined },
};

/** A long title wraps inside the header block. */
export const LongTitle: Story = {
	args: {
		title: "St. Vincent & Grenadines",
		description: "Caribbean, North America",
	},
};

/** Africa's 55 countries in a 560 px tall space: the header stays, the body scrolls. */
export const LongAndScrolling: Story = {
	args: {
		title: "Africa",
		description: "55 countries",
		children: africaBody,
	},
	decorators: [(Story) => <div style={{ height: 560 }}>{Story()}</div>],
};
