import { expect, type Page, test } from "@playwright/test";
import {
	equalEarth,
	equalEarthProjection,
} from "../../app/features/maps/equal-earth";
import { cameraFor, WORLD_BOUNDS } from "../../app/features/maps/views";

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

test("the map loads while the mouse is moving over it", async ({ page }) => {
	// A real visitor's mouse is already moving when the page opens. The map must
	// not mistake that for a failure. (It did: thorbde/map-app#26.)
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});

	await page.goto("/preview/map?view=world&owner=1");
	let moving = true;
	const wiggle = (async () => {
		for (let i = 0; moving; i++) {
			await page.mouse.move(300 + (i % 40) * 10, 300 + (i % 7) * 20);
		}
	})();
	try {
		await expect(map(page)).toHaveAttribute("data-status", "ready", {
			timeout: 30_000,
		});
	} finally {
		moving = false;
		await wiggle;
	}
	expect(errors).toEqual([]);
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

test("a country too small to click can be opened by its name", async ({
	page,
}) => {
	// The Vatican is under a kilometre across: far too small to click, even in
	// a view of its own, so its name is what opens it.
	await openPreview(page, "view=country:VA&owner=1");
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("VA");
});

test("a written country too small to see is named in the world view, and opens by its name", async ({
	page,
}) => {
	// Nauru is 5 km across: not even a pixel in the world view. A visitor may
	// open it because it is written, and its name is the only thing to click.
	const NAURU: [number, number] = [166.9326, -0.5203];
	await openPreview(page, "view=world&written=NR");
	const box = await map(page).boundingBox();
	if (!box) throw new Error("The map has no size");

	// Where Nauru's name is on the screen: the same sums the map makes.
	const camera = cameraFor(WORLD_BOUNDS, box);
	const pixelsPerMetre =
		(512 * 2 ** camera.zoom) / equalEarthProjection.tileMatrixSet.extentAtZoom0;
	const [x = 0, y = 0] = equalEarth.forward(NAURU);
	const [centreX = 0, centreY = 0] = equalEarth.forward(camera.center);
	const left = box.x + box.width / 2 + (x - centreX) * pixelsPerMetre;
	const top = box.y + box.height / 2 - (y - centreY) * pixelsPerMetre;

	await page.mouse.move(left - 60, top - 40);
	await page.mouse.move(left, top, { steps: 5 });
	await page.mouse.click(left, top);
	await expect(opened(page)).toHaveText("NR");
});

test("the page says the map is loading until it is there", async ({ page }) => {
	const response = await page.request.get("/preview/map");
	expect(await response.text()).toContain("Loading the map");

	await openPreview(page, "view=world");
	await expect(page.getByText("Loading the map")).toHaveCount(0);
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

// --- Views and controls (M1 PR 6) -------------------------------------------------

/** Where the camera is: the map writes it on its element when it starts and stops moving. */
async function camera(page: Page) {
	const element = map(page).locator("[data-zoom]");
	await expect(element).toHaveAttribute("data-moving", "false");
	const zoom = Number(await element.getAttribute("data-zoom"));
	const [lng = 0, lat = 0] = ((await element.getAttribute("data-center")) ?? "")
		.split(",")
		.map(Number);
	return { zoom, lng, lat };
}

/** Waits until the camera has come to rest at a zoom. */
async function expectZoom(page: Page, zoom: number) {
	await expect
		.poll(async () => (await camera(page)).zoom, { timeout: 10_000 })
		.toBeCloseTo(zoom, 2);
}

/** A real visitor's mouse is somewhere over the map, and moving. */
async function moveMouseOverMap(page: Page) {
	await page.mouse.move(500, 400);
	await page.mouse.move(640, 430, { steps: 5 });
}

/** Records how long the camera is on the move, from now on. */
async function watchCamera(page: Page) {
	await page.evaluate(() => {
		const element = document.querySelector("[data-zoom]") as HTMLElement;
		const seen: { at: number; moving: boolean }[] = [];
		(window as unknown as { cameraSeen: typeof seen }).cameraSeen = seen;
		new MutationObserver(() => {
			seen.push({
				at: performance.now(),
				moving: element.dataset.moving === "true",
			});
		}).observe(element, { attributes: true });
	});
}

/** How long the camera was on the move since watchCamera, in milliseconds. */
async function timeOnTheMove(page: Page): Promise<number> {
	await camera(page);
	return page.evaluate(() => {
		const { cameraSeen } = window as unknown as {
			cameraSeen: { at: number; moving: boolean }[];
		};
		const started = cameraSeen.find((each) => each.moving);
		const stopped = cameraSeen.filter((each) => !each.moving).at(-1);
		return started && stopped ? stopped.at - started.at : 0;
	});
}

const zoomIn = (page: Page) => page.getByRole("button", { name: "Zoom in" });
const zoomOut = (page: Page) => page.getByRole("button", { name: "Zoom out" });

test("the zoom buttons zoom in and out, one level at a time", async ({
	page,
}) => {
	await openPreview(page, "view=continent:europe&owner=1");
	await moveMouseOverMap(page);
	const start = await camera(page);

	await zoomIn(page).click();
	await expectZoom(page, start.zoom + 1);
	await zoomIn(page).click();
	await expectZoom(page, start.zoom + 2);
	await zoomOut(page).click();
	await expectZoom(page, start.zoom + 1);

	// Zooming with the buttons keeps the middle of the view where it is.
	const end = await camera(page);
	expect(end.lng).toBeCloseTo(start.lng, 1);
	expect(end.lat).toBeCloseTo(start.lat, 1);
});

test("zoom out can't be pressed in the world view, until the viewer has zoomed in", async ({
	page,
}) => {
	await openPreview(page, "view=world");
	await moveMouseOverMap(page);
	await expect(zoomOut(page)).toBeDisabled();
	await expect(zoomIn(page)).toBeEnabled();

	const start = await camera(page);
	await zoomIn(page).click();
	await expectZoom(page, start.zoom + 1);
	await expect(zoomOut(page)).toBeEnabled();

	await zoomOut(page).click();
	await expectZoom(page, start.zoom);
	await expect(zoomOut(page)).toBeDisabled();
});

test("zoom in can't be pressed once the map is as close as it goes", async ({
	page,
}) => {
	// Without animation, so that a dozen presses don't take a dozen waits.
	await page.emulateMedia({ reducedMotion: "reduce" });
	await openPreview(page, "view=country:VA&owner=1");
	await moveMouseOverMap(page);

	for (let presses = 0; presses < 12; presses++) {
		if (await zoomIn(page).isDisabled()) break;
		await zoomIn(page).click();
		await camera(page);
	}
	await expect(zoomIn(page)).toBeDisabled();
	await expect(zoomOut(page)).toBeEnabled();
	expect((await camera(page)).zoom).toBeCloseTo(12, 2);
});

test("the map can be moved and zoomed with the keyboard alone", async ({
	page,
}) => {
	await openPreview(page, "view=continent:africa&owner=1");
	await moveMouseOverMap(page);

	// Tab reaches the map, and its name says what the keys do.
	const canvas = map(page).locator("canvas");
	for (let tabs = 0; tabs < 20; tabs++) {
		await page.keyboard.press("Tab");
		if (await canvas.evaluate((each) => each === document.activeElement)) break;
	}
	await expect(canvas).toBeFocused();
	await expect(canvas).toHaveAccessibleName(
		"Map: arrow keys move it, plus and minus zoom",
	);
	// Focus is visible: a ring in the focus colour.
	expect(
		await canvas.evaluate((each) => getComputedStyle(each).outlineStyle),
	).toBe("solid");

	const start = await camera(page);

	await page.keyboard.press("ArrowRight");
	await expect
		.poll(async () => (await camera(page)).lng)
		.toBeGreaterThan(start.lng + 1);
	await page.keyboard.press("ArrowDown");
	await expect
		.poll(async () => (await camera(page)).lat)
		.toBeLessThan(start.lat - 1);
	expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 2);

	await page.keyboard.press("+");
	await expectZoom(page, start.zoom + 1);
	await page.keyboard.press("-");
	await expectZoom(page, start.zoom);

	// The zoom buttons come next, and work with the keyboard too.
	await page.keyboard.press("Tab");
	await expect(zoomIn(page)).toBeFocused();
	await page.keyboard.press("Enter");
	await expectZoom(page, start.zoom + 1);
	await page.keyboard.press("Tab");
	await expect(zoomOut(page)).toBeFocused();
	await page.keyboard.press("Enter");
	await expectZoom(page, start.zoom);
});

test("a zoom button that reaches its limit keeps the keyboard's focus", async ({
	page,
}) => {
	await openPreview(page, "view=world");
	await moveMouseOverMap(page);
	const start = await camera(page);

	await zoomIn(page).focus();
	await page.keyboard.press("Enter");
	await expectZoom(page, start.zoom + 1);
	await page.keyboard.press("Tab");
	await expect(zoomOut(page)).toBeFocused();
	await page.keyboard.press("Enter");
	await expectZoom(page, start.zoom);

	// As far out as it goes: the button can't be pressed, and focus stays on it.
	await expect(zoomOut(page)).toBeDisabled();
	await expect(zoomOut(page)).toBeFocused();
	await page.keyboard.press("Enter");
	await expectZoom(page, start.zoom);
	await page.keyboard.press("Shift+Tab");
	await expect(zoomIn(page)).toBeFocused();
});

test("the camera travels to a new view, and arrives where the view is", async ({
	page,
}) => {
	await openPreview(page, "view=country:SE&owner=1");
	await moveMouseOverMap(page);
	await watchCamera(page);

	await page.getByRole("link", { name: "Kenya" }).click();
	// The camera sets off (the page first has to follow the link), and takes a
	// moment to get there.
	await expect(map(page).locator("[data-zoom]")).toHaveAttribute(
		"data-moving",
		"true",
	);
	expect(await timeOnTheMove(page)).toBeGreaterThan(300);
	const arrived = await camera(page);

	// The same place as opening Kenya's view directly.
	await clickMiddle(page);
	await expect(opened(page)).toHaveText("KE");
	await openPreview(page, "view=country:KE&owner=1");
	const direct = await camera(page);
	expect(arrived.zoom).toBeCloseTo(direct.zoom, 2);
	expect(arrived.lng).toBeCloseTo(direct.lng, 2);
	expect(arrived.lat).toBeCloseTo(direct.lat, 2);
});

test("with reduced motion the camera is at the new view at once", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await openPreview(page, "view=country:SE&owner=1");
	await moveMouseOverMap(page);
	const before = await camera(page);
	await watchCamera(page);

	await page.getByRole("link", { name: "Kenya" }).click();
	await expect
		.poll(async () => (await camera(page)).lat)
		.not.toBeCloseTo(before.lat, 0);
	// No travelling: it started and stopped in the same instant.
	expect(await timeOnTheMove(page)).toBeLessThan(50);

	await clickMiddle(page);
	await expect(opened(page)).toHaveText("KE");

	// The zoom buttons don't animate either.
	const start = await camera(page);
	await watchCamera(page);
	await zoomIn(page).click();
	await expectZoom(page, start.zoom + 1);
	expect(await timeOnTheMove(page)).toBeLessThan(50);
});

test("a view is framed in the part of the map that a panel doesn't cover", async ({
	page,
}) => {
	// As the shell will: its panel, and the gap beside it, over the left of the map.
	const PANEL = 416;
	await openPreview(page, `view=country:KE&owner=1&panel=${PANEL}`);
	const box = await map(page).boundingBox();
	if (!box) throw new Error("The map has no size");

	// Kenya is in the middle of what is left, not of the whole map.
	const x = box.x + PANEL + (box.width - PANEL) / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x - 40, y - 30);
	await page.mouse.move(x, y, { steps: 5 });
	await page.mouse.click(x, y);
	await expect(opened(page)).toHaveText("KE");

	// The whole world fits beside the panel, so it is smaller than without
	// one, and that is as far out as the map goes.
	await openPreview(page, `view=world&panel=${PANEL}`);
	await expect(zoomOut(page)).toBeDisabled();
	const beside = await camera(page);
	await openPreview(page, "view=world");
	expect(beside.zoom).toBeLessThan((await camera(page)).zoom - 0.3);
});
