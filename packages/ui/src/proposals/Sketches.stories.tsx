import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Chip, Chips } from "../components/Chips/Chips";
import { chipNames, FakeMap } from "./content";
import { collapsing } from "./pieces";

// A SKETCH, not a decision (Thor's idea, 2026-11-18): the continent chips
// collapsed into the current one, opening on hover or keyboard focus.
// CSS only; a real build would use Base UI's NavigationMenu (docs/specs/m1.md).

const meta = {
	title: "Proposals/Sketches",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const block = (caption: string, children: ReactNode) => (
	<div
		style={{ display: "grid", gap: "var(--space-2)", justifyItems: "start" }}
	>
		<p
			style={{
				margin: 0,
				color: "var(--color-text-muted)",
				fontSize: "var(--font-size-sm)",
			}}
		>
			{caption}
		</p>
		{children}
	</div>
);

const chips = (label: string, current: string, className?: string) => (
	<Chips label={label} className={className}>
		{chipNames.map((name) => (
			<Chip key={name} href="#" current={name === current}>
				{name}
			</Chip>
		))}
	</Chips>
);

/**
 * Collapsed to the current continent, on top; the always-open row below.
 * Hover the top one, or press Tab (Option+Tab in Safari). The rest slide out
 * in 200 ms, or at once with reduced motion.
 */
export const CollapsingContinentChips: Story = {
	name: "Continent chips, collapsed until hover or focus",
	render: () => (
		<FakeMap>
			<div
				style={{
					position: "absolute",
					inset: "var(--space-6)",
					display: "grid",
					gap: "var(--space-8)",
					alignContent: "start",
				}}
			>
				{block(
					"Sketch: collapsed to the current continent. Hover it, or Tab to it",
					chips("Continents, collapsed", "Africa", collapsing),
				)}
				{block(
					"The same on the world view",
					chips("Continents, collapsed, world", "World", collapsing),
				)}
				{block(
					"Always open, as approved",
					chips("Continents, always open", "Africa"),
				)}
			</div>
		</FakeMap>
	),
	play: async ({ canvasElement }) => {
		const nav = within(canvasElement).getByRole("navigation", {
			name: "Continents, collapsed",
		});
		// Collapsed: one link. Tab into it and the rest appear and can be reached.
		await expect(within(nav).getAllByRole("link")).toHaveLength(1);
		await userEvent.tab();
		await expect(
			within(nav).getByRole("link", { name: "Africa" }),
		).toHaveFocus();
		await waitFor(() =>
			expect(within(nav).getAllByRole("link")).toHaveLength(7),
		);
		await userEvent.tab();
		await expect(
			within(nav).getByRole("link", { name: "Europe" }),
		).toHaveFocus();
		// Leave it collapsed, as a visitor first sees it.
		(canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
		await waitFor(() =>
			expect(within(nav).getAllByRole("link")).toHaveLength(1),
		);
	},
};
