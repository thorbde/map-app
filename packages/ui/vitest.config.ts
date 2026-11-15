import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));
// Same escape hatch as the e2e tests: use a preinstalled Chromium when one is set.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

// Every story is a test: it must render in a real browser (Chromium, through
// Playwright), and its accessibility checks (axe, via the a11y add-on) must pass.
// Stories opt out with `tags: ["!test"]`, only on purpose (playgrounds, ADR 0015).
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({ configDir: path.join(dirname, ".storybook") }),
				],
				// Pre-bundle Base UI before the tests start. Otherwise Vite discovers it
				// mid-run, re-bundles, and the stories load a second copy of React.
				optimizeDeps: { include: ["@base-ui/react/*"] },
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							...(executablePath && { launchOptions: { executablePath } }),
						}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
