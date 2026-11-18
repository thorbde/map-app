import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { chipNames } from "../../proposals/content";
import { Chip } from "./Chips";
import { CollapsingChips } from "./CollapsingChips";

const others = (current: string) =>
	chipNames
		.filter((name) => name !== current)
		.map((name) => (
			<Chip key={name} href="#">
				{name}
			</Chip>
		));

const meta = {
	title: "Components/CollapsingChips",
	component: CollapsingChips,
	args: { label: "Continents", current: "Africa", children: others("Africa") },
	// Over the map's ocean, with white land beside it, as on the map.
	decorators: [
		(Story) => (
			<div
				style={{
					minHeight: 160,
					padding: "var(--space-6)",
					background:
						"linear-gradient(90deg, var(--color-map-ocean) 0 55%, var(--color-map-land) 55%)",
				}}
			>
				{Story()}
			</div>
		),
	],
} satisfies Meta<typeof CollapsingChips>;
export default meta;

type Story = StoryObj<typeof meta>;

const control = (canvasElement: HTMLElement) => {
	const nav = within(canvasElement).getByRole("navigation", {
		name: "Continents",
	});
	return {
		nav,
		button: within(nav).getByRole("button"),
		links: () => within(nav).queryAllByRole("link"),
	};
};

/** Closed, on a continent: only "Africa" shows. Hover it, press it, or Tab to it. */
export const Closed: Story = {
	play: async ({ canvasElement }) => {
		const { button, links } = control(canvasElement);
		await expect(button).toHaveTextContent("Africa");
		await expect(button).toHaveAttribute("aria-expanded", "false");
		await expect(links()).toHaveLength(0);
	},
};

/** Closed, on the world view: it reads "World". */
export const ClosedOnTheWorld: Story = {
	name: "Closed, on the world view",
	args: { current: "World", children: others("World") },
};

/** Open: the other six beside the current one, which has not moved. */
export const Open: Story = {
	args: { defaultOpen: true },
	play: async ({ canvasElement }) => {
		const { button, links } = control(canvasElement);
		await expect(button).toHaveAttribute("aria-expanded", "true");
		await expect(links()).toHaveLength(6);
	},
};

/**
 * By keyboard: Tab to it and it opens; Tab again reaches the first continent;
 * Escape closes it and puts the focus back on the current chip.
 */
export const Keyboard: Story = {
	play: async ({ canvasElement }) => {
		const { button, links } = control(canvasElement);
		const before = button.getBoundingClientRect().left;
		await userEvent.tab();
		await expect(button).toHaveFocus();
		await waitFor(() => expect(links()).toHaveLength(6));
		// The current chip stays where it was.
		await expect(button.getBoundingClientRect().left).toBe(before);
		await userEvent.tab();
		await expect(links()[0]).toHaveFocus();
		await expect(links()[0]).toHaveTextContent("World");
		await userEvent.keyboard("{Escape}");
		await expect(button).toHaveFocus();
		await waitFor(() => expect(links()).toHaveLength(0));
		// Open again for the picture: Enter on the current chip.
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(links()).toHaveLength(6));
	},
};

/**
 * Pressed with a mouse: hovering has already opened it, so the click leaves it
 * open. (On a touch screen, which has no hover, a tap opens it, a second tap
 * or a tap elsewhere closes it. That was checked with real touch input in a
 * browser; the test tools here can't imitate a touch screen faithfully.)
 */
export const Pressed: Story = {
	play: async ({ canvasElement }) => {
		const { button, links } = control(canvasElement);
		await userEvent.click(button);
		await waitFor(() => expect(links()).toHaveLength(6));
		await expect(button).toHaveAttribute("aria-expanded", "true");
	},
};

/** In a narrow space, open: the chips wrap onto more rows under the current one. */
export const NarrowAndOpen: Story = {
	name: "Narrow, open",
	args: { defaultOpen: true },
	decorators: [(Story) => <div style={{ maxWidth: 300 }}>{Story()}</div>],
};
