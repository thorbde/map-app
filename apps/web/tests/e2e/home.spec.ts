import { expect, test } from "@playwright/test";

test("the home page renders without browser errors", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});

	await page.goto("/");
	await expect(
		page.getByRole("heading", { level: 1, name: "Hello" }),
	).toBeVisible();
	await page.waitForLoadState("networkidle");

	expect(errors).toEqual([]);
});
