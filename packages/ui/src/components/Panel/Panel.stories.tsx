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

/**
 * Links in the line under the title, on the dark header: white and underlined,
 * pale teal on hover, with a white focus ring. The first link has the keyboard
 * focus here.
 */
export const LinksInTheHeader: Story = {
	name: "Links in the header",
	args: {
		description: (
			<>
				<Link href="#">West Africa</Link>, <Link href="#">Africa</Link>
			</>
		),
	},
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "West Africa" }),
		).toHaveFocus();
	},
};

/**
 * The focus ring on the dark header, before and after. The shell moves the
 * focus to the panel's title after each navigation. Before: the usual ring,
 * `color.focus`, 2.8:1 against the header. After: white, 14.4:1.
 */
export const FocusRingOnTheHeader: Story = {
	name: "Focus ring on the header: before and after",
	decorators: [],
	render: () => (
		<div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
			{(
				[
					["Before: color.focus, 2.8:1", "var(--color-focus)"],
					[
						"After: color.text.on-inverse, 14.4:1",
						"var(--color-text-on-inverse)",
					],
				] as const
			).map(([caption, ring]) => (
				<div key={caption} style={{ display: "grid", gap: "var(--space-2)" }}>
					<p
						style={{
							margin: 0,
							color: "var(--color-text-muted)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						{caption}
					</p>
					<div
						style={{
							width: "var(--size-panel)",
							padding: "var(--space-5) var(--space-6)",
							borderRadius: "var(--radius-lg)",
							background: "var(--color-bg-inverse)",
							color: "var(--color-text-on-inverse)",
						}}
					>
						<p
							style={{
								margin: 0,
								fontSize: "var(--font-size-xl)",
								fontWeight: "var(--font-weight-bold)",
								lineHeight: "var(--font-line-height-tight)",
								outline: `2px solid ${ring}`,
								outlineOffset: 2,
							}}
						>
							Senegal
						</p>
					</div>
				</div>
			))}
		</div>
	),
};
