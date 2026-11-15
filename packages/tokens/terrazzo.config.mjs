// Builds the DTCG tokens in tokens/ into CSS custom properties (ADR 0008, ADR 0014).
// The output is committed; `pnpm --filter @thorbde/tokens check` fails if it's stale.
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

export default defineConfig({
	tokens: ["./tokens/primitives.json", "./tokens/semantic.json"],
	outDir: "./generated/",
	plugins: [
		css({
			filename: "tokens.css",
			baseSelector: ":root",
			baseScheme: "light",
		}),
	],
});
