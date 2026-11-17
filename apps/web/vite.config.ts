import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
	// Keep Vite's manifests: scripts/check-bundle-size.mjs reads the client one to
	// measure each route's first-load JavaScript (ADR 0013). React Router deletes
	// them unless this is set at the top level.
	build: {
		manifest: true,
		// Map files are always files of their own, fetched when needed. Vite would
		// otherwise copy the small ones (tiny countries) into the JavaScript, which
		// every visitor would then download (ADR 0020).
		assetsInlineLimit: (file) => (file.endsWith(".json") ? false : undefined),
	},
	plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
});
