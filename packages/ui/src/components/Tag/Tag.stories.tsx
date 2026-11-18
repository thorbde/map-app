import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { senegal, southAfrica } from "../../proposals/content";
import { Chip, Chips } from "../Chips/Chips";
import { FactBox } from "../FactBox/FactBox";
import { PanelSection } from "../Panel/Panel";
import { Tag, TagLink, TagList } from "./Tag";

const meta = {
	title: "Components/Tag",
	component: TagList,
} satisfies Meta<typeof TagList>;
export default meta;

type Story = StoryObj<typeof meta>;

const box = (background: string) => (Story: () => ReactNode) => (
	<div
		style={{
			maxWidth: "calc(var(--size-panel) - 2 * var(--space-6))",
			padding: "var(--space-4)",
			background,
		}}
	>
		{Story()}
	</div>
);
/** The fact box's pale teal, where the plain tag lives. */
const onPale = box("var(--color-bg-subtle)");
/** The panel's white. */
const onWhite = box("var(--color-bg-surface)");

const languages = southAfrica.languages.map((name) => (
	<Tag key={name}>{name}</Tag>
));

/** Tags that can't be pressed: a country's capitals. All shown. */
export const Plain: Story = {
	decorators: [onPale],
	args: {
		children: southAfrica.capitals.map((name) => <Tag key={name}>{name}</Tag>),
	},
};

/** Twelve languages with a limit of three: three tags, then "9 more". Press it for the rest. */
export const Truncated: Story = {
	decorators: [onPale],
	args: { limit: 3, children: languages },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const more = canvas.getByRole("button", { name: "9 more" });
		await expect(more).toHaveAttribute("aria-expanded", "false");
		await expect(canvas.queryByText("Zulu")).not.toBeInTheDocument();
		// By keyboard: Tab reaches the button, Enter shows all twelve, and focus
		// stays on the button, which now offers to show fewer.
		await userEvent.tab();
		await expect(more).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(canvas.getByText("Zulu")).toBeInTheDocument();
		const fewer = canvas.getByRole("button", { name: "Show fewer" });
		await expect(fewer).toHaveFocus();
		await expect(fewer).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Enter}");
		await expect(canvas.queryByText("Zulu")).not.toBeInTheDocument();
	},
};

/** The same after "9 more" is pressed. */
export const Expanded: Story = {
	decorators: [onPale],
	args: { limit: 3, children: languages },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "9 more" }),
		);
	},
};

/** Tags that are links: a country's neighbours, on the panel's white. Hover one; Tab to one for its focus ring. */
export const Links: Story = {
	decorators: [onWhite],
	args: {
		children: senegal.neighbours.map((name) => (
			<TagLink key={name} href="#">
				{name}
			</TagLink>
		)),
	},
	play: async ({ canvasElement }) => {
		await userEvent.tab();
		const first = within(canvasElement).getByRole("link", { name: "Gambia" });
		await expect(first).toHaveFocus();
		// At least 24 px tall: the smallest target WCAG 2.2 allows.
		await expect(first.getBoundingClientRect().height).toBeGreaterThanOrEqual(
			24,
		);
	},
};

const row = (caption: string, children: ReactNode) => (
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

/** The three side by side, on the panel's white and on the fact box's pale teal. */
export const ChipTagLinkAndTag: Story = {
	name: "Chip, clickable tag and plain tag",
	args: { children: null },
	render: () => (
		<>
			{(["var(--color-bg-surface)", "var(--color-bg-subtle)"] as const).map(
				(background) => (
					<div
						key={background}
						style={{
							display: "grid",
							gap: "var(--space-6)",
							padding: "var(--space-6)",
							background,
						}}
					>
						{row(
							"Continent chip: a link. 32 px tall, pill, 14 px bold, shadow",
							<Chips label={`Continents on ${background}`}>
								<Chip href="#">Africa</Chip>
								<Chip href="#" current>
									Europe
								</Chip>
							</Chips>,
						)}
						{row(
							"Clickable tag: a link. 24 px tall, pill, 12 px bold, pale teal, no shadow",
							<TagList>
								<TagLink href="#">Gambia</TagLink>
								<TagLink href="#">Guinea-Bissau</TagLink>
							</TagList>,
						)}
						{row(
							"Plain tag: can't be pressed. 20 px tall, square corners, 12 px regular, white",
							<TagList>
								<Tag>Afrikaans</Tag>
								<Tag>Northern Sotho</Tag>
							</TagList>,
						)}
					</div>
				),
			)}
		</>
	),
	parameters: {
		// The same chips are shown twice.
		a11y: { config: { rules: [{ id: "landmark-unique", enabled: false }] } },
	},
};

const longest = [
	"Papua New Guinean Sign Language",
	"Standard Moroccan Tamazight",
	"South African Sign Language",
	"Sri Jayawardenepura Kotte",
	"Bandar Seri Begawan",
];

/**
 * The longest language and capital names in our facts. A tag is always one
 * line. Top: the full width of the fact box (labels above). Bottom: the narrow
 * column beside a label, where the very longest is cut with an ellipsis and
 * its full text shows on hover.
 */
export const LongestRealValues: Story = {
	name: "Longest real values",
	args: { children: null },
	render: () => (
		<div style={{ display: "grid", gap: "var(--space-4)" }}>
			{(["above", "beside"] as const).map((labels) => (
				<div
					key={labels}
					style={{
						width: "calc(var(--size-panel) - 2 * var(--space-6))",
						background: "var(--color-bg-surface)",
					}}
				>
					<FactBox
						labels={labels}
						facts={[
							{
								label: "Languages",
								value: (
									<TagList>
										{longest.map((name) => (
											<Tag key={name}>{name}</Tag>
										))}
									</TagList>
								),
							},
						]}
					/>
				</div>
			))}
		</div>
	),
};

const options: {
	name: string;
	tokens: string;
	tag?: CSSProperties;
}[] = [
	{
		name: "A, white (as now)",
		tokens: "color.bg.surface. Text 14.4:1",
	},
	{
		name: "B, one step darker than the box",
		tokens:
			"teal.100, today only color.bg.subtle-hover: would need a token of its own. Text 11.2:1",
		tag: { background: "var(--color-bg-subtle-hover)" },
	},
	{
		name: "C, two steps darker",
		tokens: "teal.200, color.icon.fill. Text 9.2:1",
		tag: { background: "var(--color-icon-fill)" },
	},
	{
		name: "D, outlined, no fill",
		tokens: "1 px color.border.control (3.1:1 on the box). Text 12.7:1",
		tag: {
			background: "none",
			boxShadow: "inset 0 0 0 1px var(--color-border-control)",
		},
	},
	{
		name: "E, text only",
		tokens: "No tag at all: commas. Text 12.7:1. Needs no DESIGN.md exception",
	},
];

/**
 * The plain tag's colour, as a choice. Each option is a panel's body at its
 * real width: the fact box with South Africa's twelve languages showing, and
 * under it the neighbours as clickable tags on the panel's white, to see the
 * two kinds of tag together.
 */
export const ColourOptions: Story = {
	name: "Colour options",
	args: { children: null },
	render: () => (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "start",
				gap: "var(--space-6)",
				padding: "var(--space-6)",
			}}
		>
			{options.map(({ name, tokens, tag }) => (
				<div
					key={name}
					style={{
						display: "grid",
						gap: "var(--space-3)",
						width: "var(--size-panel)",
					}}
				>
					<div>
						<strong style={{ fontSize: "var(--font-size-sm)" }}>{name}</strong>
						<p
							style={{
								margin: 0,
								color: "var(--color-text-muted)",
								fontSize: "var(--font-size-xs)",
							}}
						>
							{tokens}
						</p>
					</div>
					<div
						style={{
							display: "grid",
							gap: "var(--space-6)",
							padding: "var(--space-6)",
							borderRadius: "var(--radius-lg)",
							background: "var(--color-bg-surface)",
						}}
					>
						<FactBox
							labels="above"
							facts={[
								{
									label: "Languages",
									value:
										name === "E, text only" ? (
											southAfrica.languages.join(", ")
										) : (
											<TagList>
												{southAfrica.languages.map((language) => (
													<Tag key={language} style={tag}>
														{language}
													</Tag>
												))}
											</TagList>
										),
								},
								...southAfrica.facts,
							]}
						/>
						<PanelSection title={`Neighbours (${name.slice(0, 1)})`}>
							<TagList>
								{southAfrica.neighbours.map((neighbour) => (
									<TagLink key={neighbour} href="#">
										{neighbour}
									</TagLink>
								))}
							</TagList>
						</PanelSection>
					</div>
				</div>
			))}
		</div>
	),
};
