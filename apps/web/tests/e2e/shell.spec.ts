import { expect, type Locator, type Page, test } from "@playwright/test";
import { countries } from "../../app/features/countries/countries";

// The map shell (M1 PR 5, ADR 0010), at its temporary addresses: /preview is
// the world, /preview/:continent a continent, /preview/country/:iso a country.
// The map and the chips stay; only the panel changes.

const map = (page: Page) =>
	page.getByRole("region", { name: "World map", exact: true });
const panel = (page: Page) => page.getByRole("main");
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const chips = (page: Page) =>
	page.getByRole("navigation", { name: "Continents" });

const CONTINENTS = {
	africa: "Africa",
	europe: "Europe",
	asia: "Asia",
	"north-america": "North America",
	"south-america": "South America",
	oceania: "Oceania",
} as const;

async function mapReady(page: Page) {
	await expect(map(page)).toHaveAttribute("data-status", "ready", {
		timeout: 30_000,
	});
}

/** Opens an address while the mouse moves over the map, as a visitor's does. */
async function open(page: Page, address: string) {
	await page.goto(address);
	await page.mouse.move(700, 300);
	await page.mouse.move(900, 500, { steps: 10 });
	await mapReady(page);
}

/** The middle of the part of the map that nothing floats over. */
async function clearMiddle(page: Page): Promise<{ x: number; y: number }> {
	const whole = await map(page).boundingBox();
	const side = await panel(page).boundingBox();
	const top = await chips(page).boundingBox();
	if (!whole || !side || !top) throw new Error("The shell has no size");
	const left = side.x + side.width + side.x;
	const above = top.y + top.height + top.y;
	return {
		x: left + (whole.width - left) / 2,
		y: above + (whole.height - above) / 2,
	};
}

async function clickClearMiddle(page: Page) {
	const { x, y } = await clearMiddle(page);
	await page.mouse.move(x - 80, y - 60);
	await page.mouse.move(x, y, { steps: 5 });
	await page.mouse.click(x, y);
}

/** Presses Tab until the link is focused. Fails if the link is never reached. */
async function tabTo(page: Page, link: Locator, most: number) {
	for (let presses = 0; presses < most; presses++) {
		await page.keyboard.press("Tab");
		if (await link.evaluate((element) => element === document.activeElement)) {
			return;
		}
	}
	throw new Error(`Tab didn't reach ${link} in ${most} presses`);
}

test("the map is created once and its file fetched once, from the world to a country, a neighbour and back", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	const worldFiles: string[] = [];
	page.on("request", (request) => {
		if (/\/world[^/]*\.json/.test(new URL(request.url()).pathname)) {
			worldFiles.push(request.url());
		}
	});

	await open(page, "/preview");
	await expect(heading(page)).toHaveText("The world");
	await expect(map(page)).toHaveAttribute("data-view", "world");
	const canvas = await map(page).locator("canvas").elementHandle();
	if (!canvas) throw new Error("The map has no canvas");
	const stillTheSameCanvas = () =>
		page.evaluate(
			(first) =>
				first.isConnected &&
				document.querySelectorAll("canvas").length === 1 &&
				document.querySelector("canvas") === first,
			canvas,
		);

	// A chip.
	await chips(page).getByRole("link", { name: "Africa" }).click();
	await expect(heading(page)).toHaveText("Africa");
	await expect(page).toHaveURL("/preview/africa");
	await expect(map(page)).toHaveAttribute("data-view", "continent:africa");
	expect(await stillTheSameCanvas()).toBe(true);
	await page.mouse.move(800, 400, { steps: 5 });

	// A country, from the panel.
	await panel(page).getByRole("link", { name: "Senegal" }).click();
	await expect(heading(page)).toHaveText("Senegal");
	await expect(page).toHaveURL("/preview/country/SN");
	await expect(map(page)).toHaveAttribute("data-view", "country:SN");
	expect(await stillTheSameCanvas()).toBe(true);
	await page.mouse.move(700, 500, { steps: 5 });

	// A neighbour.
	await panel(page).getByRole("link", { name: "Mali" }).click();
	await expect(heading(page)).toHaveText("Mali");
	await expect(map(page)).toHaveAttribute("data-view", "country:ML");
	expect(await stillTheSameCanvas()).toBe(true);

	// And back, twice.
	await page.goBack();
	await expect(heading(page)).toHaveText("Senegal");
	await expect(map(page)).toHaveAttribute("data-view", "country:SN");
	await page.goBack();
	await expect(heading(page)).toHaveText("Africa");
	await expect(map(page)).toHaveAttribute("data-view", "continent:africa");
	expect(await stillTheSameCanvas()).toBe(true);

	await expect(map(page)).toHaveAttribute("data-status", "ready");
	expect(worldFiles).toHaveLength(1);
	expect(errors).toEqual([]);
});

test("each address shows its panel, tells the map its view, and marks its chip", async ({
	page,
}) => {
	const pages = [
		{ address: "/preview", title: "The world", view: "world", chip: "World" },
		{
			address: "/preview/north-america",
			title: "North America",
			view: "continent:north-america",
			chip: "North America",
		},
		{
			address: "/preview/country/JP",
			title: "Japan",
			view: "country:JP",
			chip: "Asia",
		},
	];
	for (const { address, title, view, chip } of pages) {
		await open(page, address);
		await expect(heading(page)).toHaveText(title);
		await expect(panel(page)).toHaveAccessibleName(title);
		await expect(map(page)).toHaveAttribute("data-view", view);
		// Exactly one chip is the current one.
		await expect(chips(page).locator("[aria-current]")).toHaveText([chip]);
		await expect(chips(page).getByRole("link")).toHaveText([
			"World",
			...Object.values(CONTINENTS),
		]);
	}
});

test("the world panel lists the six continents with their numbers of countries", async ({
	page,
}) => {
	await page.goto("/preview");
	const items = panel(page).getByRole("listitem");
	await expect(items).toHaveText([
		"Africa 55 countries",
		"Europe 45 countries",
		"Asia 49 countries",
		"North America 23 countries",
		"South America 12 countries",
		"Oceania 16 countries",
	]);
});

test("a country's panel has its facts, its neighbours and the ways back", async ({
	page,
}) => {
	await page.goto("/preview/country/ZA");
	await expect(heading(page)).toHaveText("South Africa");

	// Three capitals as tags; twelve languages as three and "9 more".
	const fact = (label: string) =>
		panel(page)
			.locator("div")
			.filter({ has: page.getByText(label, { exact: true }) })
			.last();
	await expect(fact("Capitals").getByRole("listitem")).toHaveText([
		"Bloemfontein",
		"Cape Town",
		"Pretoria",
	]);
	await expect(fact("Languages").getByRole("listitem")).toHaveCount(4);
	await fact("Languages").getByRole("button", { name: "9 more" }).click();
	await expect(fact("Languages").getByRole("listitem")).toHaveCount(13);
	await expect(fact("Population")).toContainText(/million \(\d{4}\)/);

	const neighbours = panel(page).getByRole("region", { name: "Neighbours" });
	await expect(neighbours.getByRole("link")).toHaveText([
		"Botswana",
		"Eswatini",
		"Lesotho",
		"Mozambique",
		"Namibia",
		"Zimbabwe",
	]);

	// "Region, continent" under the name, and a link back at the end.
	await expect(
		panel(page).getByRole("link", { name: "Southern Africa" }),
	).toHaveAttribute("href", "/preview/africa#southern-africa");
	await expect(
		panel(page).getByRole("link", { name: "Africa", exact: true }),
	).toHaveAttribute("href", "/preview/africa");
	await panel(page).getByRole("link", { name: "All of Africa" }).click();
	await expect(heading(page)).toHaveText("Africa");

	// An island has no neighbours, and says so.
	await page.goto("/preview/country/IS");
	await expect(
		panel(page).getByRole("region", { name: "Neighbours" }),
	).toHaveText(/Iceland has no land borders\./);
});

test("clicking a country on the map opens its panel", async ({ page }) => {
	// Everyone counts as the owner in the preview: every country opens.
	await open(page, "/preview/africa");
	await clickClearMiddle(page);
	await expect(page).toHaveURL(/\/preview\/country\/[A-Z]{2}$/);
	const iso = page.url().slice(-2);
	const country = countries.find((each) => each.iso === iso);
	// The middle of the Africa view is a country in Africa.
	expect(country?.continent).toBe("africa");
	await expect(heading(page)).toHaveText(country?.name ?? "");
	await expect(map(page)).toHaveAttribute("data-view", `country:${iso}`);
});

test("a country's view is centred in the part of the map the panel leaves clear", async ({
	page,
}) => {
	// Kenya: the middle of its view is on its own land. If the camera ignored
	// the panel, the middle of the clear part would be in Somalia.
	await open(page, "/preview/country/KE");
	await clickClearMiddle(page);
	// Give a wrong click the time to show up.
	await page.waitForTimeout(500);
	await expect(page).toHaveURL("/preview/country/KE");
	await expect(heading(page)).toHaveText("Kenya");

	// And the world view leaves the panel clear: nothing but ocean is under it.
	await page.goto("/preview");
	await mapReady(page);
	const side = await panel(page).boundingBox();
	if (!side) throw new Error("The panel has no size");
	await page.mouse.click(side.x + side.width / 2, side.y + side.height + 150);
	await page.waitForTimeout(500);
	await expect(page).toHaveURL("/preview");
});

test("by keyboard alone, a country in every continent is reached from the world", async ({
	page,
}) => {
	// One per continent: the last country its page lists, the furthest Tab away.
	for (const [id, name] of Object.entries(CONTINENTS)) {
		const last = countries.filter((each) => each.continent === id).at(-1);
		if (!last) throw new Error(`No countries in ${id}`);

		await page.goto("/preview");
		await mapReady(page);
		await page.mouse.move(600 + name.length * 20, 400, { steps: 3 });

		// The panel comes first in the focus order: its six links are the
		// first six stops, before the chips and the map.
		await tabTo(page, panel(page).getByRole("link", { name, exact: true }), 6);
		await page.keyboard.press("Enter");
		await expect(heading(page)).toHaveText(name);
		// Focus has moved to the new panel's heading, so Tab carries on from it.
		await expect(heading(page)).toBeFocused();

		await tabTo(
			page,
			panel(page).getByRole("link", { name: last.name, exact: true }),
			60,
		);
		await page.keyboard.press("Enter");
		await expect(heading(page)).toHaveText(last.name);
		await expect(heading(page)).toBeFocused();
		await expect(page).toHaveURL(`/preview/country/${last.iso}`);
	}
});

test("every one of the 200 countries is a link on its continent's page", async ({
	page,
}) => {
	const found: string[] = [];
	for (const id of Object.keys(CONTINENTS)) {
		await page.goto(`/preview/${id}`);
		const links = await panel(page)
			.getByRole("link")
			.evaluateAll((all) =>
				all.map((link) => ({
					name: link.textContent,
					href: link.getAttribute("href"),
				})),
			);
		const expected = countries
			.filter((each) => each.continent === id)
			.map((each) => ({
				name: each.name,
				href: `/preview/country/${each.iso}`,
			}));
		const byName = (a: { name: string | null }, b: { name: string | null }) =>
			(a.name ?? "").localeCompare(b.name ?? "");
		expect(links.sort(byName), id).toEqual(expected.sort(byName));
		found.push(...links.map((link) => link.href ?? ""));
	}
	expect(new Set(found).size).toBe(200);
	expect(found).toHaveLength(countries.length);
});

test("focus moves to the new panel's heading after a link, and stays on the map after a click on it", async ({
	page,
}) => {
	await open(page, "/preview");
	// On arrival nothing is focused: the browser starts at the top as usual.
	await expect(heading(page)).not.toBeFocused();

	await chips(page).getByRole("link", { name: "Europe" }).click();
	await expect(heading(page)).toHaveText("Europe");
	await expect(heading(page)).toBeFocused();

	await panel(page).getByRole("link", { name: "Denmark" }).click();
	await expect(heading(page)).toHaveText("Denmark");
	await expect(heading(page)).toBeFocused();

	// The same panel component with a new country: focus still moves.
	await panel(page).getByRole("link", { name: "Germany" }).click();
	await expect(heading(page)).toHaveText("Germany");
	await expect(heading(page)).toBeFocused();

	await page.goBack();
	await expect(heading(page)).toHaveText("Denmark");
	await expect(heading(page)).toBeFocused();

	// A country opened from the map: focus stays on the map.
	await chips(page).getByRole("link", { name: "Africa" }).click();
	await expect(map(page)).toHaveAttribute("data-view", "continent:africa");
	await clickClearMiddle(page);
	await expect(page).toHaveURL(/\/preview\/country\//);
	await expect(heading(page)).not.toBeFocused();
	expect(
		await map(page).evaluate((region) =>
			region.contains(document.activeElement),
		),
	).toBe(true);
});

test("the panel comes before the chips and the map in the page", async ({
	page,
}) => {
	await page.goto("/preview/country/SN");
	const order = await page.evaluate(() => {
		const position = (selector: string) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`No ${selector}`);
			return element;
		};
		const main = position("main");
		const nav = position("nav");
		const region = position('section[aria-label="World map"]');
		const before = (a: Element, b: Element) =>
			Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
		return [before(main, nav), before(nav, region)];
	});
	expect(order).toEqual([true, true]);
});

test("unknown addresses are 404", async ({ page }) => {
	for (const address of [
		"/preview/atlantis",
		"/preview/country/ZZ",
		// Codes are written as the country list writes them.
		"/preview/country/sn",
		"/preview/country/SN/more",
		"/preview/africa/more",
	]) {
		const response = await page.goto(address);
		expect(response?.status(), address).toBe(404);
		await expect(heading(page)).toHaveText("Page not found");
	}
	// The map component's own page is still where it was.
	const response = await page.goto("/preview/map");
	expect(response?.status()).toBe(200);
	await expect(heading(page)).toHaveText("Map preview");
});

test.describe("with JavaScript off", () => {
	test.use({ javaScriptEnabled: false });

	test("the panels can be read and their links followed", async ({ page }) => {
		await page.goto("/preview");
		await expect(heading(page)).toHaveText("The world");
		await panel(page).getByRole("link", { name: "Oceania" }).click();

		await expect(heading(page)).toHaveText("Oceania");
		await expect(
			panel(page).getByRole("heading", { name: "Polynesia" }),
		).toBeVisible();
		await panel(page).getByRole("link", { name: "Fiji" }).click();

		await expect(heading(page)).toHaveText("Fiji");
		await expect(
			panel(page).getByText("Capital", { exact: true }),
		).toBeVisible();
		await expect(panel(page).getByText("Suva")).toBeVisible();
		await expect(panel(page).getByText(/\(\d{4}\)/)).toBeVisible();

		await chips(page).getByRole("link", { name: "World" }).click();
		await expect(heading(page)).toHaveText("The world");
	});
});
