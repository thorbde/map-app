import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { expect, userEvent, within } from "storybook/test";
import { africa, senegal } from "../../proposals/content";
import { CountryBody } from "../../proposals/panels";
import { africaShapes } from "../../proposals/shapes";
import { Link } from "../Link/Link";
import { ShapeTiles } from "../ShapeTiles/ShapeTiles";
import { Panel, PanelSection } from "./Panel";

const onOcean: CSSProperties = {
	boxSizing: "border-box",
	padding: "var(--space-4)",
	background: "var(--color-map-ocean)",
};

const countryBody = <CountryBody country={senegal} />;

const shape = (name: string) => africaShapes[name]?.d ?? "";
const africaBody = africa.map(({ region, countries }) => (
	<PanelSection key={region} title={region}>
		<ShapeTiles
			dense
			columns={4}
			items={countries.map((name) => ({ name, href: "#", d: shape(name) }))}
		/>
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

const headerLinks = (
	<>
		<Link href="#">West Africa</Link>
		<Link href="#">Africa</Link>
	</>
);

/**
 * Links under the title, on the dark header: white and underlined, spaced
 * apart, pale teal on hover. Here the first has the keyboard focus: the link
 * unchanged, underline included, with a white ring around it (2 px, 2 px
 * away, small corners) that clears the title above and the next link.
 */
export const HeaderFirstLinkFocused: Story = {
	name: "Header: first link focused",
	args: { description: headerLinks },
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "West Africa" }),
		).toHaveFocus();
	},
};

/** The second link focused. */
export const HeaderSecondLinkFocused: Story = {
	name: "Header: second link focused",
	args: { description: headerLinks },
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "Africa" }),
		).toHaveFocus();
	},
};

/**
 * The title focused, as after each navigation, when the shell moves the
 * keyboard focus to the new panel's heading.
 */
export const HeaderTitleFocused: Story = {
	name: "Header: title focused",
	args: { description: headerLinks },
	play: async ({ canvasElement }) => {
		const title = within(canvasElement).getByRole("heading", { level: 1 });
		// What the shell does: the heading can take focus, but isn't a Tab stop.
		title.tabIndex = -1;
		await userEvent.tab();
		await userEvent.tab({ shift: true });
		title.focus();
		await expect(title).toHaveFocus();
	},
};

/** A link in the panel's body focused: the link unchanged, with the same ring in the usual colour. */
export const BodyLinkFocused: Story = {
	name: "Body: link focused",
	args: {
		children: (
			<p>
				<Link href="#">← All of Africa</Link>
			</p>
		),
	},
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "← All of Africa" }),
		).toHaveFocus();
	},
};
