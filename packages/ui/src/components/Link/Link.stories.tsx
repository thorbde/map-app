import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "./Link";

const meta = {
	title: "Components/Link",
	component: Link,
	parameters: { layout: "centered" },
	args: { href: "#", children: "Read the method" },
} satisfies Meta<typeof Link>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
	render: (args) => (
		<p style={{ maxWidth: 420, margin: 0 }}>
			Each essay follows a simple method. <Link {...args} /> before you start
			your first country.
		</p>
	),
};

export const LooksLikeAButton: Story = {
	render: () => (
		<nav aria-label="Essays" style={{ display: "flex", gap: "var(--space-3)" }}>
			<Link href="#" variant="secondary">
				← Chile
			</Link>
			<Link href="#" variant="primary">
				Next: Senegal →
			</Link>
		</nav>
	),
};
