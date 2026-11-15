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

test("the design tokens reach the page", async ({ page }) => {
	await page.goto("/");
	const { token, background } = await page.evaluate(() => ({
		token: getComputedStyle(document.documentElement)
			.getPropertyValue("--color-bg-page")
			.trim(),
		background: getComputedStyle(document.body).backgroundColor,
	}));

	// Defined by @thorbde/tokens, and used by the page (not the browser default).
	expect(token).not.toBe("");
	expect(background).not.toBe("rgba(0, 0, 0, 0)");
});
