// Checks each page's first-load JavaScript against the budget in ADR 0013.
//
// For every leaf route, the first load is: the client entry, plus the route
// chunks of the route and all its parent layouts, plus everything those import
// statically. Each file is counted once and measured gzipped.
//
// Run after `pnpm build`. Exits with 1 when a page is over budget.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 150_000; // 150 KB gzipped, in Vite's units (1 KB = 1000 bytes)

// Pages outside the reading-page budget. CodeMirror loads only here (CLAUDE.md).
const EXCLUDED_PATH_PREFIXES = ["/write"];

const clientDir = "build/client";
const manifest = JSON.parse(
	readFileSync(join(clientDir, ".vite/manifest.json"), "utf8"),
);
const routeTree = JSON.parse(
	execFileSync("react-router", ["routes", "--json"], { encoding: "utf8" }),
);

const entryKey = Object.keys(manifest).find(
	(key) => manifest[key].isEntry && manifest[key].name === "entry.client",
);
if (!entryKey) {
	throw new Error("No client entry in the Vite manifest. Did the build run?");
}

const routeChunkKey = (file) => `app/${file}?__react-router-build-client-route`;

/** All JS files a manifest entry loads up front: itself and its static imports. */
function collectFiles(key, files = new Set()) {
	const chunk = manifest[key];
	if (!chunk || files.has(chunk.file)) return files;
	files.add(chunk.file);
	for (const imported of chunk.imports ?? []) collectFiles(imported, files);
	return files;
}

const gzippedSize = (file) =>
	gzipSync(readFileSync(join(clientDir, file)), { level: 9 }).length;

/** Leaf routes with their full path and the chain of route files above them. */
function leafRoutes(routes, parentPath = "", chain = []) {
	return routes.flatMap((route) => {
		const path = route.path
			? `${parentPath}/${route.path}`.replace(/\/+/g, "/")
			: parentPath;
		const files = [...chain, route.file];
		if (route.children?.length) {
			return leafRoutes(route.children, path, files);
		}
		return [{ id: route.id, path: path || "/", files }];
	});
}

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} KB`;
let failed = false;

for (const route of leafRoutes(routeTree)) {
	if (EXCLUDED_PATH_PREFIXES.some((prefix) => route.path.startsWith(prefix))) {
		console.log(`- ${route.path} (${route.id}): not budgeted`);
		continue;
	}

	const files = collectFiles(entryKey);
	for (const file of route.files) collectFiles(routeChunkKey(file), files);

	const sizes = [...files].map((file) => ({ file, bytes: gzippedSize(file) }));
	const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0);
	const over = total > BUDGET_BYTES;
	failed ||= over;

	console.log(
		`${over ? "✗" : "✓"} ${route.path} (${route.id}): ${kb(total)} of ${kb(BUDGET_BYTES)}`,
	);
	for (const { file, bytes } of sizes.sort((a, b) => b.bytes - a.bytes)) {
		console.log(`    ${kb(bytes).padStart(9)}  ${file}`);
	}
}

if (failed) {
	console.error(
		"\nOver the JavaScript budget (ADR 0013). Find what grew in the list above.",
	);
	process.exit(1);
}
