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

test("the fonts are self-hosted: Montserrat loads, and nothing is requested from another site", async ({
	page,
	baseURL,
}) => {
	const elsewhere: string[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.protocol.startsWith("http") && url.origin !== baseURL) {
			elsewhere.push(request.url());
		}
	});

	await page.goto("/");
	const loaded = await page.evaluate(async () => {
		await document.fonts.ready;
		return {
			family: getComputedStyle(document.body).fontFamily,
			montserrat: document.fonts.check('16px "Montserrat"'),
		};
	});

	expect(loaded.family).toMatch(/^"?Montserrat"?/);
	expect(loaded.montserrat).toBe(true);
	expect(elsewhere).toEqual([]);
});
