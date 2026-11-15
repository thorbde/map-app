// Import rules from ARCHITECTURE.md ("Boundaries"), enforced in CI by `pnpm boundaries`.
// tests/boundaries/ proves every rule catches what it should.
// Paths are relative to the repository root.

const APP = "^apps/web/app/";
const FRONT_DOOR = "index(\\.server)?\\.ts$";
// Colocated tests, for example features/maps/draw.test.ts (ARCHITECTURE.md).
const TEST_FILE = "\\.test\\.tsx?$";
// Storybook stories and playgrounds, which never ship.
const STORY_FILE = "\\.stories\\.tsx?$";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		// The design system knows nothing about any app (ADR 0008).
		{
			name: "design-system-not-to-apps",
			severity: "error",
			comment: "packages/* must stay reusable: they never import from apps/*.",
			from: { path: "^packages/" },
			to: { path: "^apps/" },
		},
		{
			name: "tokens-not-to-other-packages",
			severity: "error",
			comment:
				"@thorbde/tokens is the bottom layer: it imports nothing from the repo.",
			from: { path: "^packages/tokens/" },
			to: { path: "^packages/", pathNot: "^packages/tokens/" },
		},
		{
			name: "icons-not-to-other-packages",
			severity: "error",
			comment:
				"@thorbde/icons stands alone: it imports nothing from the repo (ADR 0016).",
			from: { path: "^packages/icons/" },
			to: { path: "^packages/", pathNot: "^packages/icons/" },
		},
		{
			name: "ui-only-to-tokens-and-icons",
			severity: "error",
			comment:
				"@thorbde/ui may import @thorbde/tokens and @thorbde/icons, and no other package.",
			from: { path: "^packages/ui/" },
			to: {
				path: "^packages/",
				pathNot: ["^packages/ui/", "^packages/tokens/", "^packages/icons/"],
			},
		},

		// Features talk to each other through their front doors only (ADR 0002).
		{
			name: "feature-to-feature-front-door",
			severity: "error",
			comment:
				"Import another feature only through its index.ts or index.server.ts.",
			from: { path: `${APP}features/([^/]+)/` },
			to: {
				path: `${APP}features/[^/]+/`,
				pathNot: [`${APP}features/$1/`, `${APP}features/[^/]+/${FRONT_DOOR}`],
			},
		},
		{
			name: "routes-to-feature-front-door",
			severity: "error",
			comment:
				"Routes import features only through index.ts or index.server.ts.",
			from: { path: `${APP}routes/` },
			to: {
				path: `${APP}features/[^/]+/`,
				pathNot: `${APP}features/[^/]+/${FRONT_DOOR}`,
			},
		},
		{
			name: "routes-not-to-db",
			severity: "error",
			comment:
				"Routes are thin: database access belongs in a feature's queries.",
			from: { path: `${APP}routes/` },
			to: { path: `${APP}server/db/` },
		},

		// Cloudflare-specific code stays in server/platform/ (ADR 0001).
		{
			name: "platform-front-door",
			severity: "error",
			comment:
				"Outside server/platform/, import only server/platform/index.server.ts.",
			from: { pathNot: `${APP}server/platform/` },
			to: {
				path: `${APP}server/platform/`,
				pathNot: `${APP}server/platform/index\\.server\\.ts$`,
			},
		},
		{
			name: "cloudflare-apis-only-in-platform",
			severity: "error",
			comment:
				"Only server/platform/ (and tests) may import cloudflare:* modules, so the app stays portable.",
			from: {
				pathNot: [`${APP}server/platform/`, "^apps/web/tests/", TEST_FILE],
			},
			to: { path: "^cloudflare:" },
		},

		// lib/ holds shared pure utilities.
		{
			name: "lib-stays-generic",
			severity: "error",
			comment: "lib/ must not import features, routes or server code.",
			from: { path: `${APP}lib/` },
			to: { path: `${APP}(features|routes|server)/` },
		},

		// General hygiene.
		{
			name: "no-circular",
			severity: "error",
			comment: "Circular imports make code hard to follow and to split.",
			from: {},
			to: { circular: true },
		},
		{
			name: "not-to-unresolvable",
			severity: "error",
			comment: "The import points at something that doesn't exist.",
			from: {},
			to: {
				couldNotResolve: true,
				// Provided at build time by workerd, Vite and React Router's type generation.
				pathNot: ["^cloudflare:", "^virtual:", "/\\+types/"],
			},
		},
		{
			name: "app-not-to-dev-deps",
			severity: "error",
			comment:
				"App code ships to users, so it can't depend on devDependencies (type-only imports are fine).",
			from: {
				path: "^(apps/[^/]+/app|packages/[^/]+/src)/",
				// The route table is read at build time by React Router's tooling, and
				// tests (colocated *.test.ts files) never ship.
				pathNot: [`${APP}routes\\.ts$`, TEST_FILE, STORY_FILE],
			},
			// Peer dependencies (React in @thorbde/ui) are provided by the app that uses the package.
			to: {
				dependencyTypes: ["npm-dev"],
				dependencyTypesNot: ["type-only", "npm-peer"],
			},
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		// Only app and design-system code is checked. Repo tooling, docs and tests/boundaries/
		// (whose fixtures break the rules on purpose) are left out, as are build output and
		// generated files.
		exclude: {
			path: [
				"^(tests|docs|scripts|\\.github)/",
				"^[^/]+\\.(c|m)?[jt]s$",
				"(^|/)(build|storybook-static|\\.react-router|\\.wrangler)/",
				"worker-configuration\\.d\\.ts$",
			],
		},
		tsPreCompilationDeps: true,
		combinedDependencies: true,
		tsConfig: { fileName: "apps/web/tsconfig.cloudflare.json" },
		enhancedResolveOptions: {
			exportsFields: ["exports"],
			conditionNames: ["import", "require", "node", "default", "types"],
			extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
		},
		reporterOptions: {
			mermaid: { minify: false },
		},
	},
};
