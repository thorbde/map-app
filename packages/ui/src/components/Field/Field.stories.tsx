import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./Field";

const meta = {
	title: "Components/Field",
	component: Field,
	parameters: { layout: "padded" },
	args: { label: "Username", name: "username" },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 360 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Field>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
	args: {
		description:
			"Lowercase letters, numbers and dashes. Shown in your map's address.",
	},
};

export const WithError: Story = {
	args: {
		defaultValue: "alex",
		description:
			"Lowercase letters, numbers and dashes. Shown in your map's address.",
		error: "That username is taken.",
	},
};

export const Disabled: Story = {
	args: { defaultValue: "alex", disabled: true },
};
