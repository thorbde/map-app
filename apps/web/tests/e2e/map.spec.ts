import { expect, type Page, test } from "@playwright/test";

// The map component, on its temporary preview page (M1 PR 4). The page is driven
// by its address: ?view=…&written=…&selected=…&owner=1.

const map = (page: Page) =>
	page.getByRole("region", { name: "World map", exact: true });
const opened = (page: Page) => page.getByRole("status");

async function openPreview(page: Page, query: string) {
	await page.goto(`/preview/map?${query}`);
	await expect(map(page)).toHaveAttribute("data-status", "ready", {
		timeout: 30_000,
	});
}

/** Clicks the middle of the map, which is where a country view centres its country. */
async function clickMiddle(page: Page) {
	const box = await map(page).boundingBox();
	if (!box) throw new Error("The map has no size");
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("the page is there before the map, and the map then loads without errors", async ({
	page,
	baseURL,
}) => {
	const errors: string[] = [];
	const elsewhere: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.protocol.startsWith("http") && url.origin !== baseURL) {
			elsewhere.push(request.url());
		}
	});

	// The server's HTML already has the page's content; the map comes later.
	const response = await page.request.get("/preview/map");
	const html = await response.text();
	expect(html).toContain("Map preview");
	expect(html).toContain('data-status="loading"');
	expect(html).not.toContain("<canvas");

	await openPreview(page, "view=world");
	await expect(map(page).locator("canvas")).toBeVisible();
	await page.waitForLoadState("networkidle");

	expect(errors).toEqual([]);
	// No tiles, no fonts, nothing from another site (ADR 0021).
	expect(elsewhere).toEqual([]);
});

test("the owner can open any country by clicking it", async ({ page }) => {
	await openPreview(page, "view=country:BR&owner=1");
	await expect(opened(page)).toHaveText("nothing yet");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("BR");
});

test("a visitor can open a written country", async ({ page }) => {
	await openPreview(page, "view=country:KE&written=KE,SE");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("KE");
});

test("a visitor can't open a country that isn't written", async ({ page }) => {
	await openPreview(page, "view=country:KE&written=SE");
	await clickMiddle(page);
	// Give a wrong click the time to show up.
	await page.waitForTimeout(500);
	await expect(opened(page)).toHaveText("nothing yet");
});

test("a country too small for a shape can be opened by its marker dot", async ({
	page,
}) => {
	// Malta has no shape in the world file: it is a dot.
	await openPreview(page, "view=country:MT&owner=1");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("MT");
});

test("the selected country can be opened too", async ({ page }) => {
	// Kenya, because the middle of its view is on land. (Sweden's is in the
	// Gulf of Bothnia.)
	await openPreview(page, "view=country:KE&written=KE&selected=KE");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("KE");
});

test("the view follows the address: a continent, then a country", async ({
	page,
}) => {
	// In the Africa view, the middle of the map is not Brazil.
	await openPreview(page, "view=continent:africa&owner=1");
	await clickMiddle(page);
	await expect(opened(page)).not.toHaveText("BR");
	await expect(opened(page)).not.toHaveText("nothing yet");
});

/** The detailed map files the page has fetched, by continent. */
function watchDetailFiles(page: Page): string[] {
	const fetched: string[] = [];
	page.on("response", (response) => {
		const match = new URL(response.url()).pathname.match(
			/\/assets\/(africa|asia|europe|north-america|oceania|south-america)-[\w-]+\.json$/,
		);
		if (match?.[1] && response.ok()) fetched.push(match[1]);
	});
	return fetched;
}

test("the world view loads no detailed shapes", async ({ page }) => {
	const fetched = watchDetailFiles(page);
	await openPreview(page, "view=world");
	await page.waitForLoadState("networkidle");
	expect(fetched).toEqual([]);
});

test("zoomed in on a country, only its continent's detailed shapes load", async ({
	page,
}) => {
	const fetched = watchDetailFiles(page);
	await openPreview(page, "view=country:KE&owner=1");
	await expect.poll(() => fetched).toEqual(["africa"]);
	await page.waitForLoadState("networkidle");
	expect(fetched).toEqual(["africa"]);

	// The detailed shapes can be clicked like the coarse ones.
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("KE");
});

test("a country that is only a dot on the world map has a shape once zoomed in", async ({
	page,
}) => {
	// Malta: no shape in the world file, a shape in Europe's.
	const fetched = watchDetailFiles(page);
	await openPreview(page, "view=country:MT&owner=1");
	await expect.poll(() => fetched).toContain("europe");
	await page.waitForLoadState("networkidle");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("MT");
});

test("without WebGL the page still works, and says the map can't be shown", async ({
	page,
}) => {
	// A browser without WebGL: asking a canvas for it gives nothing.
	await page.addInitScript(() => {
		const original = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (
			this: HTMLCanvasElement,
			type: string,
			...rest: unknown[]
		) {
			if (type.startsWith("webgl")) return null;
			return (original as (...args: unknown[]) => unknown).call(
				this,
				type,
				...rest,
			);
		} as typeof original;
	});

	await page.goto("/preview/map?view=world");
	await expect(map(page)).toHaveAttribute("data-status", "unavailable", {
		timeout: 30_000,
	});
	await expect(
		page.getByText("The map can’t be shown in this browser."),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Map preview" }),
	).toBeVisible();
});
