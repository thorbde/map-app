import { defineConfig, devices } from "@playwright/test";

// e2e tests run against the production build served locally by `vite preview`
// on workerd. Never against a deployed URL (ADR 0007).
const port = 4173;

// Optional: use an already-installed Chromium (for example in a dev container)
// instead of the one `playwright install` downloads.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
	testDir: "./tests/e2e",
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: [["list"]],
	use: {
		baseURL: `http://localhost:${port}`,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: {
					// The map is drawn with WebGL (ADR 0021). Headless Chromium has no
					// graphics card, so it is told to draw in software.
					args: [
						"--use-angle=swiftshader",
						"--enable-unsafe-swiftshader",
						"--ignore-gpu-blocklist",
					],
					...(executablePath && { executablePath }),
				},
			},
		},
	],
	webServer: {
		command: `pnpm preview --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
