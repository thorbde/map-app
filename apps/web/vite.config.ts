import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
	// Keep Vite's manifests: scripts/check-bundle-size.mjs reads the client one to
	// measure each route's first-load JavaScript (ADR 0013). React Router deletes
	// them unless this is set at the top level.
	build: { manifest: true },
	plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
});
