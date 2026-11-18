import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { expect, userEvent, within } from "storybook/test";
import { chipNames } from "../../proposals/content";
import { Chip, Chips } from "./Chips";

const onOcean: CSSProperties = {
	padding: "var(--space-6)",
	background: "var(--color-map-ocean)",
};
const onLand: CSSProperties = {
	padding: "var(--space-6)",
	background: "var(--color-map-land)",
};

const continentChips = (current: string) =>
	chipNames.map((name) => (
		<Chip key={name} href="#" current={name === current}>
			{name}
		</Chip>
	));

const meta = {
	title: "Components/Chips",
	component: Chips,
	args: { label: "Continents", children: continentChips("World") },
	decorators: [(Story) => <div style={onOcean}>{Story()}</div>],
} satisfies Meta<typeof Chips>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Resting chips and the current one ("World"), on the ocean. Hover one to see its hover colour. */
export const OnTheOcean: Story = {
	play: async ({ canvasElement }) => {
		const nav = within(canvasElement).getByRole("navigation", {
			name: "Continents",
		});
		await expect(
			within(nav).getByRole("link", { name: "World" }),
		).toHaveAttribute("aria-current", "page");
		await expect(within(nav).getAllByRole("link")).toHaveLength(7);
	},
};

/** The same over white land, where a white chip has only its shadow. */
export const OnLand: Story = {
	args: { children: continentChips("Africa") },
	decorators: [(Story) => <div style={onLand}>{Story()}</div>],
};

/** Keyboard focus: the first chip (the current one), then the second (a resting one). */
export const Focused: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		await userEvent.tab();
		await expect(
			within(canvasElement).getByRole("link", { name: "Africa" }),
		).toHaveFocus();
	},
};

/** In a narrow space the chips wrap onto more rows. */
export const Wrapping: Story = {
	decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};
