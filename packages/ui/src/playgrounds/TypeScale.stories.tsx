import type { Meta, StoryObj } from "@storybook/react-vite";

// A modular scale: every step is the previous one times the ratio.
const STEPS = [
	{ name: "Display", step: 5, sample: "Ghana" },
	{ name: "Heading 1", step: 4, sample: "West Africa" },
	{ name: "Heading 2", step: 3, sample: "Geography and nature" },
	{ name: "Heading 3", step: 2, sample: "Cities" },
	{ name: "Large", step: 1, sample: "12 / 195 countries written" },
	{
		name: "Body",
		step: 0,
		sample: "The Volta was dammed into the largest reservoir on Earth.",
	},
	{
		name: "Small",
		step: -1,
		sample: "Written 3 November 2026 · Updated 9 November",
	},
	{ name: "Caption", step: -2, sample: "From Wikidata, updated monthly" },
];

type Args = {
	base: number;
	ratio: number;
	headingFont: string;
	bodyFont: string;
	theme: "light" | "dark";
};

const meta: Meta<Args> = {
	title: "Playgrounds/Type scale",
	// A design tool, not a component: not part of the tests (see Colour palettes).
	tags: ["!test"],
	args: {
		base: 16,
		ratio: 1.25,
		headingFont: "Source Serif 4",
		bodyFont: "IBM Plex Sans",
		theme: "light",
	},
	argTypes: {
		base: { control: { type: "range", min: 14, max: 20, step: 1 } },
		ratio: {
			control: "select",
			options: [1.125, 1.2, 1.25, 1.333, Math.SQRT2, 1.5],
			description:
				"1.2 minor third · 1.25 major third · 1.333 perfect fourth · 1.414 (√2) augmented fourth",
		},
		headingFont: {
			control: "text",
			description:
				"Load it in the Fonts playground first, or use a system font",
		},
		bodyFont: { control: "text" },
		theme: { control: "inline-radio", options: ["light", "dark"] },
	},
};

export default meta;

export const Scale: StoryObj<Args> = {
	render: (args) => (
		<div
			style={{
				padding: 24,
				display: "grid",
				gap: 16,
				background: args.theme === "light" ? "#fbfbf9" : "#16191d",
				color: args.theme === "light" ? "#1a1d21" : "#e8eaed",
				minHeight: "100vh",
			}}
		>
			{STEPS.map(({ name, step, sample }) => {
				const size = args.base * args.ratio ** step;
				const font = step >= 2 ? args.headingFont : args.bodyFont;
				return (
					<div
						key={name}
						style={{
							display: "grid",
							gridTemplateColumns: "140px 1fr",
							gap: 16,
							alignItems: "baseline",
						}}
					>
						<div
							style={{
								fontFamily: "system-ui, sans-serif",
								fontSize: 12,
								opacity: 0.7,
							}}
						>
							{name}
							<br />
							{size.toFixed(1)} px · {(size / 16).toFixed(3)} rem
						</div>
						<div
							style={{
								fontFamily: `"${font}", ${step >= 2 ? "serif" : "sans-serif"}`,
								fontSize: size,
								fontWeight: step >= 2 ? 600 : 400,
								lineHeight: step >= 2 ? 1.15 : 1.5,
							}}
						>
							{sample}
						</div>
					</div>
				);
			})}
		</div>
	),
};
