import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { africa, continents } from "../../proposals/content";
import { africaShapes, continentShapes } from "../../proposals/shapes";
import { ShapeTiles } from "./ShapeTiles";

const slug = (name: string) => name.toLowerCase().replaceAll(" ", "-");
const world = continents.map(({ name, countries }) => ({
	name,
	href: "#",
	detail: `${countries} countries`,
	d: continentShapes[slug(name)] ?? "",
}));
const westAfrica = (written: readonly string[] = []) =>
	(africa[1]?.countries ?? []).map((name) => ({
		name,
		href: "#",
		d: africaShapes[name]?.d ?? "",
		written: written.includes(name),
	}));

const meta = {
	title: "Components/ShapeTiles",
	component: ShapeTiles,
	args: { items: world },
	// As wide as a panel's body, on its white.
	decorators: [
		(Story) => (
			<div
				style={{
					width: "calc(var(--size-panel) - 2 * var(--space-6))",
					padding: "var(--space-6)",
					background: "var(--color-bg-surface)",
				}}
			>
				{Story()}
			</div>
		),
	],
} satisfies Meta<typeof ShapeTiles>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A few large tiles, three to a row: the continents of the world, each with a second line. */
export const Large: Story = {};

/** Many small tiles, four to a row: West Africa's fifteen countries. Long names run to two lines. */
export const Dense: Story = {
	args: { dense: true, columns: 4, items: westAfrica() },
	play: async ({ canvasElement }) => {
		const links = within(canvasElement).getAllByRole("link");
		await expect(links).toHaveLength(15);
		// Every tile is a comfortable target: well over 24 px each way.
		for (const link of links) {
			const { width, height } = link.getBoundingClientRect();
			await expect(Math.min(width, height)).toBeGreaterThanOrEqual(48);
		}
	},
};

/** Some written: their outlines take the map's written colour. */
export const SomeWritten: Story = {
	name: "Some written",
	args: {
		dense: true,
		columns: 4,
		items: westAfrica(["Senegal", "Ghana", "Nigeria"]),
	},
};

/** Keyboard focus on a tile: the usual ring, around the outline and its name. */
export const Focused: Story = {
	args: { dense: true, columns: 4, items: westAfrica() },
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "Burkina Faso" }),
		).toHaveFocus();
	},
};
