import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vitest/config";

// Unit and integration tests run inside workerd, the Workers runtime (ADR 0013).
// React Router's plugin provides the server build that the Worker entry imports,
// so integration tests can send requests through the whole app.
// The "local" environment of wrangler.jsonc brings the database binding; every test file
// gets its own copy of the database, and tests/setup/database.ts applies the migrations to it.
export default defineConfig(async () => {
	const migrations = await readD1Migrations(
		fileURLToPath(new URL("./app/server/db/migrations", import.meta.url)),
	);
	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc", environment: "local" },
				miniflare: {
					bindings: {
						TEST_MIGRATIONS: migrations,
						// Made-up sign-in settings for the tests: no real Google client, no real secret.
						BETTER_AUTH_SECRET: "test-only-secret-not-used-anywhere-else",
						BETTER_AUTH_URL: "http://localhost",
						GOOGLE_CLIENT_ID: "test-client-id",
						GOOGLE_CLIENT_SECRET: "test-client-secret",
					},
				},
			}),
			reactRouter(),
		],
		test: {
			include: [
				"app/**/*.test.ts",
				"scripts/**/*.test.ts",
				"tests/integration/**/*.test.ts",
			],
			setupFiles: ["./tests/setup/database.ts"],
			// A test file's first request loads the whole server build into workerd; with Better
			// Auth that takes about 6 s here, over Vitest's 5 s default. The assertions are unchanged.
			testTimeout: 20_000,
		},
	};
});
