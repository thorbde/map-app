import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { senegal, southAfrica } from "../../proposals/content";
import { FactBox } from "./FactBox";

// PROPOSAL (M1 PR 5), awaiting Thor's review.

const meta = {
	title: "Components/FactBox",
	component: FactBox,
	args: { facts: senegal.facts },
	// As wide as it is inside a panel: the panel's width less its padding.
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
} satisfies Meta<typeof FactBox>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Senegal: short values. */
export const ShortValues: Story = {
	play: async ({ canvasElement }) => {
		// A description list: each label is a term, each value its definition.
		const canvas = within(canvasElement);
		await expect(canvas.getAllByRole("term")[0]).toHaveTextContent("Capital");
		await expect(canvas.getAllByRole("definition")[0]).toHaveTextContent(
			"Dakar",
		);
	},
};

/** South Africa: three capitals and twelve languages. Long values wrap beside their label. */
export const LongValues: Story = {
	args: { facts: southAfrica.facts },
};
