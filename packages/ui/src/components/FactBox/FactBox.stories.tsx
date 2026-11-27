import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { senegal, southAfrica } from "../../proposals/content";
import { Tag, TagList } from "../Tag/Tag";
import { FactBox } from "./FactBox";

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

/** South Africa: three capitals and twelve languages, as tags. The first three, then "9 more". */
export const LongValues: Story = {
	args: {
		facts: [
			{
				label: "Capitals",
				value: (
					<TagList limit={3}>
						{southAfrica.capitals.map((name) => (
							<Tag key={name}>{name}</Tag>
						))}
					</TagList>
				),
			},
			{
				label: "Languages",
				value: (
					<TagList limit={3}>
						{southAfrica.languages.map((name) => (
							<Tag key={name}>{name}</Tag>
						))}
					</TagList>
				),
			},
			...southAfrica.facts,
		],
	},
};
