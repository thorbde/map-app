import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vitest/config";

// Unit and integration tests run inside workerd, the Workers runtime (ADR 0013).
// React Router's plugin provides the server build that the Worker entry imports,
// so integration tests can send requests through the whole app.
export default defineConfig({
	plugins: [
		cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } }),
		reactRouter(),
	],
	test: {
		include: ["app/**/*.test.ts", "tests/integration/**/*.test.ts"],
	},
});
