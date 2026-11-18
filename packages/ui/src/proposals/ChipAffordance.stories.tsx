import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRightIcon } from "@thorbde/icons";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Chip } from "../components/Chips/Chips";
import { CollapsingChips } from "../components/Chips/CollapsingChips";
import styles from "./affordance.module.css";
import { chipNames, FakeMap } from "./content";

// PROPOSAL (M1 PR 5): the closed continent control must say that it opens.
// What others do:
//   - Google Maps' and Material's chips that open something carry a small
//     arrow after the label.
//   - GitHub's reviewer avatars and Gmail's labels show a count of what is
//     hidden: "+3".
//   - Stacks (avatar piles, iOS notification groups) let the edges of the
//     hidden items show behind the first.
// Options A to D below; every one is the real control and can be used.
// The chevron is a NEW ICON, PROPOSED: it needs Thor's approval (see "The
// proposed chevron icon").

const others = (current: string) =>
	chipNames
		.filter((name) => name !== current)
		.map((name) => (
			<Chip key={name} href="#">
				{name}
			</Chip>
		));

const chevron = <ChevronRightIcon size="sm" className={styles.chevron} />;
const count = <span className={styles.count}>+6</span>;

const option = {
	a: { indicator: chevron },
	b: { className: styles.peek },
	c: { indicator: count },
	d: { indicator: chevron, className: styles.peek },
} as const;

function Control({
	which,
	current = "Africa",
	label,
	text,
	open,
}: {
	which: keyof typeof option;
	current?: string;
	label: string;
	/** What the closed chip reads, if not the current view's name. */
	text?: string;
	open?: boolean;
}) {
	return (
		<CollapsingChips
			label={label}
			current={text ?? current}
			defaultOpen={open}
			{...option[which]}
		>
			{others(current)}
		</CollapsingChips>
	);
}

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

const rows = (children: ReactNode) => (
	<FakeMap>
		<div
			style={{
				position: "absolute",
				inset: "var(--space-6)",
				display: "grid",
				gap: "var(--space-5)",
				alignContent: "start",
				justifyItems: "start",
			}}
		>
			{children}
		</div>
	</FakeMap>
);

const each = (which: keyof typeof option, name: string) =>
	rows(
		<>
			{caption(
				`${name}. Closed, on a continent: hover it, press it, or Tab to it`,
			)}
			<Control which={which} label={`${name}, closed`} />
			{caption("Closed, on the world view")}
			<Control which={which} current="World" label={`${name}, world`} />
			{caption("Open")}
			<Control which={which} label={`${name}, open`} open />
		</>,
	);

const meta = {
	title: "Proposals/Collapsing chips: how it says it opens",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The four options closed, one under the other, with today's (nothing) on top. */
export const AllClosed: Story = {
	name: "All options, closed",
	render: () =>
		rows(
			<>
				{caption("Today: nothing says it opens")}
				<CollapsingChips label="Today" current="Africa">
					{others("Africa")}
				</CollapsingChips>
				{caption("A: a chevron, as on Google Maps' and Material's chips")}
				<Control which="a" label="A" />
				{caption("B: a peek, the edges of more chips behind it, as a stack")}
				<Control which="b" label="B" />
				{caption(
					"C: a count of what is hidden, as GitHub's and Gmail's \"+3\"",
				)}
				<Control which="c" label="C" />
				{caption("D: chevron and peek together")}
				<Control which="d" label="D" />
			</>,
		),
	play: async ({ canvasElement }) => {
		// Each is still one button that says it is collapsed.
		const buttons = within(canvasElement).getAllByRole("button");
		await expect(buttons).toHaveLength(5);
		for (const button of buttons) {
			await expect(button).toHaveAttribute("aria-expanded", "false");
		}
	},
};

/** A: a chevron after the name. It turns to point back when the row is open. */
export const AChevron: Story = {
	name: "A: chevron",
	render: () => each("a", "A"),
};

/** B: a peek. Two more chips' edges show behind the current one; they slide away as the row opens. */
export const BPeek: Story = {
	name: "B: peek",
	render: () => each("b", "B"),
};

/** C: a count. "+6" after the name; it goes when the row is open. */
export const CCount: Story = {
	name: "C: count",
	render: () => each("c", "C"),
};

/** D: chevron and peek together. */
export const DChevronAndPeek: Story = {
	name: "D: chevron and peek",
	render: () => each("d", "D"),
};

/** The world view's closed chip: "World", or "Continents"? Both with the chevron. */
export const WorldOrContinents: Story = {
	name: "World view: World or Continents",
	render: () =>
		rows(
			<>
				{caption('The world view reads "World" (the name of what is showing)')}
				<Control which="a" current="World" label="Reads World" />
				{caption('The world view reads "Continents" (what it opens)')}
				<Control
					which="a"
					current="World"
					text="Continents"
					label="Reads Continents"
				/>
			</>,
		),
};

/**
 * PROPOSED ICON, awaiting Thor's approval: chevron-right, drawn with the icon
 * tool (docs/design/icons.md). The approval sheet: both variants at 56, 24, 20
 * and 16 px, on white and on the dark chip.
 */
export const ProposedChevronIcon: Story = {
	name: "The proposed chevron icon",
	render: () => (
		<div
			style={{
				display: "grid",
				gap: "var(--space-4)",
				padding: "var(--space-6)",
			}}
		>
			{caption(
				"PROPOSED, not approved: chevron-right. One open line, 2 px, round ends and joins (2.5 px in solid). Duotone above, solid below",
			)}
			{(
				[
					["var(--color-bg-surface)", "var(--color-text-default)"],
					["var(--color-bg-inverse)", "var(--color-text-on-inverse)"],
				] as const
			).map(([background, color]) => (
				<div
					key={background}
					style={{
						display: "grid",
						gap: "var(--space-3)",
						padding: "var(--space-4)",
						background,
						color,
					}}
				>
					{(["duotone", "solid"] as const).map((variant) => (
						<div
							key={variant}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--space-4)",
							}}
						>
							{[56, 24, 20, 16].map((size) => (
								<ChevronRightIcon
									key={size}
									variant={variant}
									style={{ width: size, height: size }}
								/>
							))}
						</div>
					))}
				</div>
			))}
		</div>
	),
};
