// Runs before every test file: applies the migrations to that file's own, empty database.
// applyD1Migrations skips the ones already applied, so running it again is harmless.
import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

declare global {
	namespace Cloudflare {
		interface Env {
			TEST_MIGRATIONS: D1Migration[];
		}
	}
}

await applyD1Migrations(env.DB as D1Database, env.TEST_MIGRATIONS);
