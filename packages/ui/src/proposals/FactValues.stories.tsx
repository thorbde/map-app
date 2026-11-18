import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FactBox } from "../components/FactBox/FactBox";
import { Link } from "../components/Link/Link";
import { Panel, PanelSection } from "../components/Panel/Panel";
import { southAfrica } from "./content";
import { FlatChips, Shell, Values } from "./pieces";

// PROPOSAL (M1 PR 5), round 2: long values in the fact box (South Africa's
// three capitals and twelve languages) show the first three, then a button
// that shows the rest.
//
// A rule is in the way, and both sides are shown: DESIGN.md says "if it looks
// like a pill, it does something", and a language can't be pressed.
//   Tags: each value in a square-cornered tag, visibly not a chip. Needs a
//         new line in DESIGN.md allowing tags for short values in the fact box.
//   Text: plain text, as DESIGN.md stands today.
// In both, the control is a real button that reads as a link: "9 more", then
// "Show fewer". Space or Enter presses it; screen readers hear whether it is open.

const capitals = ["Bloemfontein", "Cape Town", "Pretoria"];
const languages = [
	"Afrikaans",
	"English",
	"Northern Sotho",
	"Sesotho",
	"South African Sign Language",
	"Southern Ndebele",
	"Swazi",
	"Tsonga",
	"Tswana",
	"Venda",
	"Xhosa",
	"Zulu",
];

const facts = (look: "tags" | "text", open = false) => [
	{ label: "Capitals", value: <Values values={capitals} look={look} /> },
	{
		label: "Languages",
		value: <Values values={languages} look={look} defaultOpen={open} />,
	},
	...southAfrica.facts.slice(2),
];

const panel = (look: "tags" | "text", open = false) => (
	<Shell current="Africa">
		<Panel title="South Africa" description="Southern Africa, Africa">
			<FactBox facts={facts(look, open)} />
			<PanelSection title="Neighbours">
				<FlatChips names={southAfrica.neighbours} />
			</PanelSection>
			<p>
				<Link href="#">← All of Africa</Link>
			</p>
		</Panel>
	</Shell>
);

const meta = {
	title: "Proposals/Fact values",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** Tags, as the page opens: three languages and "9 more". */
export const TagsCollapsed: Story = {
	name: "Tags, collapsed",
	render: () => panel("tags"),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// By keyboard: reach the button, press it, and all twelve are there.
		const more = canvas.getByRole("button", { name: "9 more" });
		await expect(more).toHaveAttribute("aria-expanded", "false");
		await expect(canvas.queryByText("Zulu")).not.toBeInTheDocument();
		more.focus();
		await userEvent.keyboard("{Enter}");
		await expect(canvas.getByText("Zulu")).toBeInTheDocument();
		const fewer = canvas.getByRole("button", { name: "Show fewer" });
		await expect(fewer).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(canvas.queryByText("Zulu")).not.toBeInTheDocument();
	},
};

/** Tags, after "9 more" is pressed. */
export const TagsExpanded: Story = {
	name: "Tags, expanded",
	render: () => panel("tags", true),
};

/** Plain text, as the page opens. No change to DESIGN.md needed. */
export const TextCollapsed: Story = {
	name: "Text, collapsed",
	render: () => panel("text"),
};

/** Plain text, after "9 more" is pressed. */
export const TextExpanded: Story = {
	name: "Text, expanded",
	render: () => panel("text", true),
};
