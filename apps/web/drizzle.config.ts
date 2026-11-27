// drizzle-kit reads this to generate migrations from the schema (`pnpm db:generate`, ADR 0006).
// Wrangler applies them (`pnpm db:migrate`, local only), and the tests apply them to a fresh database.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./app/server/db/schema.ts",
	out: "./app/server/db/migrations",
});
