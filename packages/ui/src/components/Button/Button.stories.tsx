import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
	title: "Components/Button",
	component: Button,
	parameters: { layout: "centered" },
	args: { children: "Publish" },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
	args: { variant: "secondary", children: "Save draft" },
};

export const Disabled: Story = {
	args: { disabled: true },
};

/** Reads as a link in text. For a small action inside content, as after a list of tags. */
export const LinkLook: Story = {
	args: { variant: "link", children: "9 more" },
};

export const Together: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "var(--space-3)" }}>
			<Button variant="secondary">← Chile</Button>
			<Button>Next: Senegal →</Button>
		</div>
	),
};
