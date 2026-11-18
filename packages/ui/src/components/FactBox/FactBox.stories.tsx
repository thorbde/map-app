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

const longFacts = (open: boolean) => [
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
			<TagList limit={3} defaultOpen={open}>
				{southAfrica.languages.map((name) => (
					<Tag key={name}>{name}</Tag>
				))}
			</TagList>
		),
	},
	...southAfrica.facts,
];

/**
 * Choose by eye: labels beside the values (first) or above them (second), each
 * at the width it has inside a panel, with all twelve languages showing.
 * Above gives the values the box's full width.
 */
export const LabelsBesideOrAbove: Story = {
	name: "Labels beside or above",
	render: () => (
		<div style={{ display: "grid", gap: "var(--space-6)" }}>
			{(["beside", "above"] as const).map((labels) => (
				<FactBox key={labels} labels={labels} facts={longFacts(true)} />
			))}
		</div>
	),
};
