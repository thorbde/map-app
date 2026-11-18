import type { Meta, StoryObj } from "@storybook/react-vite";
import { MinusIcon, PlusIcon } from "@thorbde/icons";
import type { CSSProperties } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { IconButton } from "./IconButton";

// PROPOSAL (M1 PR 6): the zoom buttons, for Thor's approval.

const onOcean: CSSProperties = {
	display: "inline-flex",
	padding: "var(--space-6)",
	background: "var(--color-map-ocean)",
};
const onLand: CSSProperties = {
	...onOcean,
	background: "var(--color-map-land)",
};
const column: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--space-2)",
};

const meta = {
	title: "Components/IconButton",
	component: IconButton,
	args: { label: "Zoom in", children: <PlusIcon />, onClick: fn() },
	decorators: [(Story) => <div style={onOcean}>{Story()}</div>],
} satisfies Meta<typeof IconButton>;
export default meta;

type Story = StoryObj<typeof meta>;

/** One button on the ocean. Hover it for the hover colour, tab to it for the focus ring. */
export const OnTheOcean: Story = {
	play: async ({ args, canvasElement }) => {
		const button = within(canvasElement).getByRole("button", {
			name: "Zoom in",
		});
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};

/** The zoom buttons as they sit on the map: plus over minus, 8 px apart. */
export const ZoomButtons: Story = {
	render: () => (
		<div style={column}>
			<IconButton label="Zoom in">
				<PlusIcon />
			</IconButton>
			<IconButton label="Zoom out">
				<MinusIcon />
			</IconButton>
		</div>
	),
};

/** The same on land, where the white button has less to stand out against. */
export const OnLand: Story = {
	decorators: [(Story) => <div style={onLand}>{Story()}</div>],
	render: ZoomButtons.render,
};

/** Zoomed all the way out: "Zoom out" can't be pressed. */
export const AtTheLimit: Story = {
	render: () => (
		<div style={column}>
			<IconButton label="Zoom in">
				<PlusIcon />
			</IconButton>
			<IconButton label="Zoom out" disabled>
				<MinusIcon />
			</IconButton>
		</div>
	),
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByRole("button", { name: "Zoom out" }),
		).toBeDisabled();
	},
};

/** On a touch screen controls are 40 px, not 32. */
export const OnTouchScreens: Story = {
	decorators: [
		(Story) => (
			<div
				style={
					{ "--size-control": "var(--size-control-touch)" } as CSSProperties
				}
			>
				{Story()}
			</div>
		),
	],
	render: ZoomButtons.render,
};
