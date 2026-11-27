// Checks each page's first-load JavaScript against the budget in ADR 0013, and
// the lazily loaded map engine against its own limit (ADR 0021), and the
// outline files that arrive in the panels' HTML against theirs (ADR 0020).
//
// For every leaf route, the first load is: the client entry, plus the route
// chunks of the route and all its parent layouts, plus everything those import
// statically. Each file is counted once and measured gzipped.
//
// Run after `pnpm build`. Exits with 1 when a page is over budget.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { OUTLINE_FILE_BUDGET_BYTES } from "../app/features/maps/outline-file.ts";

const BUDGET_BYTES = 150_000; // 150 KB gzipped, in Vite's units (1 KB = 1000 bytes)

// The map engine (MapLibre) loads after the page and is outside the budget above.
// Its own limit is what it measured when it was added (459 KB: MapLibre's
// 296 KB, its 148 KB worker, 10 KB of CSS and 4 KB of our own code), plus
// about 10% (ADR 0021).
const MAP_ENGINE_ENTRY = "app/features/maps/map-engine.client.ts";
const MAP_ENGINE_BUDGET_BYTES = 500_000;

// MapLibre's licence asks that its notice travels with the code. The build
// strips it from the JavaScript, so the full text is served as a file instead.
const MAP_ENGINE_LICENCE = {
	from: "node_modules/maplibre-gl/LICENSE.txt",
	served: "licenses/maplibre-gl.txt",
};

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

// --- The map engine --------------------------------------------------------------

const engine = manifest[MAP_ENGINE_ENTRY];
if (!engine?.isDynamicEntry) {
	// If the map engine became part of a page's first load, the page budgets
	// above already count it. It must stay lazy (ADR 0021).
	console.error(
		`\n✗ ${MAP_ENGINE_ENTRY} is not a lazily loaded chunk any more.`,
	);
	failed = true;
} else {
	const firstLoad = collectFiles(entryKey);
	// The engine's own chunk, and MapLibre, which it loads as a chunk of its own.
	const chunkKeys = [MAP_ENGINE_ENTRY, ...(engine.dynamicImports ?? [])];
	const engineFiles = new Set();
	for (const key of chunkKeys) {
		for (const file of collectFiles(key)) {
			if (!firstLoad.has(file)) engineFiles.add(file);
		}
		for (const file of manifest[key]?.css ?? []) engineFiles.add(file);
		// The workers the engine starts. Map data (JSON) has its own budget (ADR 0020).
		for (const file of manifest[key]?.assets ?? []) {
			if (file.endsWith(".js")) engineFiles.add(file);
		}
	}
	const sizes = [...engineFiles].map((file) => ({
		file,
		bytes: gzippedSize(file),
	}));
	const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0);
	const over = total > MAP_ENGINE_BUDGET_BYTES;
	failed ||= over;
	console.log(
		`${over ? "✗" : "✓"} the map engine, loaded after the page: ${kb(total)} of ${kb(MAP_ENGINE_BUDGET_BYTES)}`,
	);
	for (const { file, bytes } of sizes.sort((a, b) => b.bytes - a.bytes)) {
		console.log(`    ${kb(bytes).padStart(9)}  ${file}`);
	}
}

const licence = readFileSync(MAP_ENGINE_LICENCE.from, "utf8");
let served = "";
try {
	served = readFileSync(join(clientDir, MAP_ENGINE_LICENCE.served), "utf8");
} catch {
	// Reported below.
}
if (served !== licence) {
	console.error(
		`\n✗ ${MAP_ENGINE_LICENCE.served} is missing or differs from MapLibre's licence. Copy ${MAP_ENGINE_LICENCE.from} to public/${MAP_ENGINE_LICENCE.served}.`,
	);
	failed = true;
} else {
	console.log(
		`✓ MapLibre's licence is served at /${MAP_ENGINE_LICENCE.served}`,
	);
}

// --- The outlines on the panels' tiles --------------------------------------------

// They are read on the server and arrive in a panel's HTML, so they are not
// in the build: the committed files are measured.
const outlinesDir = "app/features/maps/geometry/outlines";
for (const name of readdirSync(outlinesDir).sort()) {
	const bytes = gzipSync(readFileSync(join(outlinesDir, name)), {
		level: 9,
	}).length;
	const over = bytes > OUTLINE_FILE_BUDGET_BYTES;
	failed ||= over;
	console.log(
		`${over ? "✗" : "✓"} outlines/${name}, in the panel's HTML: ${kb(bytes)} of ${kb(OUTLINE_FILE_BUDGET_BYTES)}`,
	);
}

if (failed) {
	console.error(
		"\nOver a size budget (ADR 0013, ADR 0020, ADR 0021), or a check above failed. Find what changed in the list above.",
	);
	process.exit(1);
}
