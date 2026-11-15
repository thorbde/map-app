import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button";
import { Dialog, DialogClose } from "./Dialog";

const meta = {
	title: "Components/Dialog",
	component: Dialog,
	parameters: { layout: "centered" },
	args: {
		trigger: <Button variant="secondary">Delete account</Button>,
		title: "Delete your account?",
		description:
			"Your essays and your map will be deleted for good. This can't be undone.",
		actions: (
			<>
				<DialogClose>Keep my account</DialogClose>
				<Button>Delete account</Button>
			</>
		),
	},
} satisfies Meta<typeof Dialog>;
export default meta;

type Story = StoryObj<typeof meta>;

const focused = (doc: Document) => doc.activeElement as HTMLElement | null;

// The dialog renders in a portal on <body>, outside the story's canvas.
const page = (canvasElement: HTMLElement) =>
	within(canvasElement.ownerDocument.body);

/** Opened, so the accessibility check runs on the open dialog. */
export const Open: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Delete account" }),
		);
		await expect(
			await page(canvasElement).findByRole("dialog", {
				name: "Delete your account?",
			}),
		).toBeVisible();
	},
};

/** Keyboard: focus moves in, stays in, and returns to the trigger on Escape. */
export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const doc = canvasElement.ownerDocument;
		const trigger = within(canvasElement).getByRole("button", {
			name: "Delete account",
		});

		await step("Enter opens it and moves focus inside", async () => {
			trigger.focus();
			await userEvent.keyboard("{Enter}");
			const dialog = await page(canvasElement).findByRole("dialog");
			await waitFor(() => expect(dialog).toContainElement(focused(doc)));
		});

		await step("Tab stays inside the dialog", async () => {
			const dialog = page(canvasElement).getByRole("dialog");
			for (let i = 0; i < 4; i++) {
				await userEvent.tab();
				await expect(dialog).toContainElement(focused(doc));
			}
		});

		await step(
			"Escape closes it and focus returns to the trigger",
			async () => {
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page(canvasElement).queryByRole("dialog")).toBeNull(),
				);
				await waitFor(() => expect(doc.activeElement).toBe(trigger));
			},
		);
	},
};

/** "Keep my account" closes it too. */
export const CloseButton: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Delete account" }),
		);
		await userEvent.click(
			await page(canvasElement).findByRole("button", {
				name: "Keep my account",
			}),
		);
		await waitFor(() =>
			expect(page(canvasElement).queryByRole("dialog")).toBeNull(),
		);
	},
};
