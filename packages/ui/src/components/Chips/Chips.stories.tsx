import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Caption, chipNames } from "../../proposals/content";
import { Link } from "../Link/Link";
import { Chip, Chips } from "./Chips";

// PROPOSAL (M1 PR 5), awaiting Thor's review.

const onOcean: CSSProperties = {
	padding: "var(--space-6)",
	background: "var(--color-map-ocean)",
};
const onLand: CSSProperties = {
	padding: "var(--space-6)",
	background: "var(--color-map-land)",
};

const continentChips = (current: string, chipStyle?: CSSProperties) =>
	chipNames.map((name) => (
		<Chip key={name} href="#" current={name === current} style={chipStyle}>
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

function Row({ caption, children }: { caption: string; children: ReactNode }) {
	return (
		<div style={{ display: "grid", gap: "var(--space-2)" }}>
			<Caption>{caption}</Caption>
			{children}
		</div>
	);
}

const hairline: CSSProperties = {
	border: "1px solid var(--color-border-default)",
};

function Alternatives() {
	return (
		<div style={{ display: "grid", gap: "var(--space-6)" }}>
			<Row caption="A (proposed): white, the one shadow, dark current chip">
				<Chips label="Continents, A">{continentChips("Africa")}</Chips>
			</Row>
			<Row caption="B: the same with a hairline edge (color.border.default)">
				<Chips label="Continents, B">
					{continentChips("Africa", hairline)}
				</Chips>
			</Row>
			<Row caption="C: the Button's looks, pale teal with a teal current chip, no shadow">
				<nav aria-label="Continents, C">
					<div
						style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
					>
						{chipNames.map((name) => (
							<Link
								key={name}
								href="#"
								variant={name === "Africa" ? "primary" : "secondary"}
								aria-current={name === "Africa" ? "page" : undefined}
							>
								{name}
							</Link>
						))}
					</div>
				</nav>
			</Row>
		</div>
	);
}

/** Choose by eye: the proposed chip, the same with a hairline, and the Button's pale teal. Over the ocean, then over land. */
export const AlternativesSideBySide: Story = {
	decorators: [],
	render: () => (
		<>
			<div style={onOcean}>
				<Alternatives />
			</div>
			<div style={onLand}>
				<Alternatives />
			</div>
		</>
	),
	parameters: {
		// The same three groups are shown twice, so their names repeat.
		a11y: { config: { rules: [{ id: "landmark-unique", enabled: false }] } },
	},
};
