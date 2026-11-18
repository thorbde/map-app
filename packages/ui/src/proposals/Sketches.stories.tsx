import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Chip, Chips } from "../components/Chips/Chips";
import { chipNames, FakeMap } from "./content";
import { collapsing, Tag } from "./pieces";

// PROPOSAL (M1 PR 5), round 2: two things to judge by eye.

const meta = {
	title: "Proposals/Sketches",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const caption = (text: string) => (
	<p
		style={{
			margin: 0,
			color: "var(--color-text-muted)",
			fontSize: "var(--font-size-sm)",
		}}
	>
		{text}
	</p>
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

const block = (children: ReactNode) => (
	<div
		style={{ display: "grid", gap: "var(--space-2)", justifyItems: "start" }}
	>
		{children}
	</div>
);

/**
 * A sketch of Thor's idea: the continent chips collapsed into the current one,
 * opening when the pointer is over it or the keyboard focus is in it. Below it,
 * the always-open row. Hover the first, or press Tab.
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
					<>
						{caption("Collapsed: only the current continent shows")}
						{chips("Continents, collapsed", "Africa", collapsing)}
					</>,
				)}
				{block(
					<>
						{caption("Always open, as approved")}
						{chips("Continents, always open", "Africa")}
					</>,
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
		await expect(within(nav).getAllByRole("link")).toHaveLength(7);
		await userEvent.tab();
		await expect(
			within(nav).getByRole("link", { name: "Europe" }),
		).toHaveFocus();
		// Leave it collapsed, as a visitor first sees it.
		(canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
		await expect(within(nav).getAllByRole("link")).toHaveLength(1);
	},
};

/** The small tag for fact values beside a continent chip, so the difference shows. On the fact box's pale teal. */
export const TagBesideAChip: Story = {
	name: "Tag beside a continent chip",
	render: () => (
		<div
			style={{
				display: "grid",
				gap: "var(--space-6)",
				padding: "var(--space-6)",
				background: "var(--color-bg-subtle)",
			}}
		>
			{block(
				<>
					{caption("Chip: a link. 32 px tall, pill, 14 px bold, shadow")}
					<Chips label="A continent chip">
						<Chip href="#">Africa</Chip>
						<Chip href="#" current>
							Europe
						</Chip>
					</Chips>
				</>,
			)}
			{block(
				<>
					{caption(
						"Tag: can't be pressed. 20 px tall, square corners (radius.sm), 12 px regular, no shadow",
					)}
					<div style={{ display: "flex", gap: "var(--space-2)" }}>
						<Tag>Afrikaans</Tag>
						<Tag>English</Tag>
						<Tag>Northern Sotho</Tag>
					</div>
				</>,
			)}
		</div>
	),
};
