import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "./Link";

const meta = {
	title: "Components/Link",
	component: Link,
	parameters: { layout: "centered" },
	argTypes: {
		variant: {
			control: "inline-radio",
			options: ["inline", "primary", "secondary"],
		},
		children: { control: "text" },
		href: { control: "text" },
	},
	args: { href: "#", variant: "inline", children: "Read the method" },
} satisfies Meta<typeof Link>;
export default meta;

type Story = StoryObj<typeof meta>;

/** In running text: underlined, so it's never identified by colour alone. */
export const Inline: Story = {
	render: (args) => (
		<p style={{ maxWidth: 420, margin: 0 }}>
			Each essay follows a simple method. <Link {...args} /> before you start
			your first country.
		</p>
	),
};

/** A link that reads as the main action. Looks like the primary Button. */
export const Primary: Story = {
	args: { variant: "primary", children: "Next: Senegal →" },
};

/** Looks like the secondary Button. */
export const Secondary: Story = {
	args: { variant: "secondary", children: "← Chile" },
};
