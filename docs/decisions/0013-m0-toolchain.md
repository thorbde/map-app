# 0013: The M0 toolchain: packages, versions and sizes

- **Status:** accepted
- **Date:** 2026-11-15
- **Updates:** ADR 0001 (React Router v8 instead of v7)

## Context
CLAUDE.md requires an ADR for every dependency: why, the alternatives, and its size. ADR 0001 chose the stack; this ADR records the actual packages and versions as they're added during M0. Each M0 PR adds its packages here.

## Decision

### Versions worth knowing about
- **React Router v8, not v7.** v8.0 came out in June 2026. It mostly turns v7's opt-in "future flags" into the default (middleware always on, the Vite Environment API, split route modules). We have no code to migrate, and it's the same framework mode ADR 0001 describes. One visible difference: the request context passed to loaders is a `RouterContextProvider`, not a plain object.
- **TypeScript 6.0, not 7.0.** TypeScript 7 is the new native compiler. It ships without the JavaScript API that dependency-cruiser and knip (M0 PR 4) rely on. We move to 7 when those tools support it.
- **Node 22 LTS** (`.nvmrc`, at least 22.22.0, which React Router v8 requires). Node is only used for tooling; the app runs on the Workers runtime.
- **pnpm 10,** pinned in `packageManager`. It runs install scripts only for packages listed in `pnpm-workspace.yaml`: `workerd` (the local Workers runtime) and `esbuild`, which download platform binaries.
- **Exact versions** in every `package.json`, with no `^` ranges, so installs are reproducible and upgrades are deliberate.

### Packages added in M0 PR 1 (the scaffold)

**Shipped to the browser.** Measured from the production build of an empty "Hello" page: **~114 KB gzipped of JavaScript in total.**

| Package | Version | Why |
|---|---|---|
| `react`, `react-dom` | 19.3.1 | UI library (ADR 0001) |
| `react-router` | 8.5.1 | Routing, data loading, server rendering (ADR 0001) |

**Server only** (inside the Worker, not shipped to browsers):

| Package | Version | Why | Size |
|---|---|---|---|
| `isbot` | 5.2.3 | Sends complete HTML to crawlers instead of a stream | 49 KB unpacked |

**Development tools** (never deployed):

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `@react-router/dev` | 8.5.1 | React Router's build tooling and type generation | 0.4 MB |
| `vite` | 8.3.8 | Bundler and dev server | 2.4 MB |
| `@cloudflare/vite-plugin` | 1.69.1 | Runs dev and builds on the real Workers runtime (workerd) | 4.4 MB |
| `wrangler` | 4.162.0 | Cloudflare CLI: types, deploys, D1 | 15.8 MB |
| `typescript` | 6.0.3 | Type checking | 24.3 MB |
| `@biomejs/biome` | 2.6.8 | Linting and formatting, in one fast tool | 1.1 MB, plus a platform binary |
| `@types/node`, `@types/react`, `@types/react-dom` | 22.20.5, 19.3.0, 19.3.0 | Type definitions | 2.9 MB together |

The whole `node_modules` is about 735 MB, most of it the `workerd` binaries that Wrangler and the Vite plugin bring.

### Added in M0 PR 2 (CI)

No new npm packages. The JavaScript budget is checked by a small script, `apps/web/scripts/check-bundle-size.mjs`. It reads React Router's route tree and Vite's client manifest, then gzips each page's first-load files. `vite.config.ts` keeps that manifest with `build.manifest: true`; the manifest also ends up as a public file at `/.vite/manifest.json`, which is harmless because it only lists files that are already public.

GitHub Actions used by the workflows:

| Action | Version | Why |
|---|---|---|
| `actions/checkout` | v7 | Gets the code |
| `actions/setup-node` | v7 | Node from `.nvmrc`, with the pnpm cache |
| `pnpm/action-setup` | v6.1.1, pinned to its commit | Installs the pnpm version from `packageManager`. Third-party, so it's pinned to an exact commit that can't be changed under us |
| `actions/upload-artifact`, `actions/download-artifact` | v7, v8 | Hand the preview build from the job without secrets to the deploy job |

The preview deploy and cleanup run `wrangler` through `npx` at a pinned version, which must match `apps/web/package.json`, so the PR's dependencies are never installed next to the Cloudflare token.

### Added in M0 PR 3 (tests)

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `vitest` | 5.1.0 | Unit and integration tests | 2.9 MB |
| `@cloudflare/vitest-plugin` | 1.8.2 | Runs Vitest tests inside workerd, with the real Worker and its bindings | 9.6 MB |
| `@playwright/test` | 1.65.1 | End-to-end tests in a real browser | 14 MB with `playwright-core`, plus Chromium, downloaded in CI |

- **`@cloudflare/vitest-pool-workers` is deprecated:** Cloudflare renamed it to `@cloudflare/vitest-plugin`, which also supports Vitest 5. The old package needed Vitest 4.
- **Integration tests load React Router's Vite plugin** in `vitest.config.ts`, because the Worker entry imports the generated server build. That way a test request goes through exactly what production runs.
- **e2e tests use the production build** (`vite preview` on workerd), never a deployed URL (ADR 0007). No retries, so a flaky test shows up instead of hiding. Traces are kept on failure and uploaded from CI.

### Added in M0 PR 4 (boundaries)

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `dependency-cruiser` | 18.7.2 | Enforces the import rules from ARCHITECTURE.md; draws the dependency graph | 1.0 MB |
| `knip` | 6.45.1 | Finds unused files, exports and dependencies | 1.6 MB |

- **The rules are proven by tests,** not just configured: `tests/boundaries/fixtures/` has one small fake project per rule that breaks it, and `tests/boundaries/rules.test.mjs` checks that each fixture trips exactly its rule. Another test fails if a rule is added without a fixture. These tests use Node's built-in test runner, so no extra package is needed.
- **The dependency graph** is a Mermaid diagram (`pnpm graph`), added to the summary of every CI run on `main`. GitHub renders it, so there's nothing to install, such as Graphviz.
- **knip** needs almost no configuration: its React Router, Vite, Vitest, Playwright and wrangler plugins find the entry points. React Router route modules count as entry points, so their exports (`loader`, `meta`…) aren't reported as unused.

### Added in M0 PR 5 (Storybook and playgrounds)

All in `packages/ui`, as devDependencies:

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `storybook` | 10.6.7 | The design-system workbench | 22 MB |
| `@storybook/react-vite` | 10.6.7 | Storybook for React, built with our Vite | 32 KB |
| `@storybook/addon-a11y` | 10.6.7 | axe accessibility checks in every story | 0.2 MB |
| `react`, `react-dom`, `typescript`, `vite`, `@types/react(-dom)` | as in `apps/web` | `@thorbde/ui` also lists React as a peer dependency: the app brings its own copy | already installed |

- **Playgrounds aren't components.** They live in `src/playgrounds/` as stories, never ship, and use inline styles. Their colour maths (OKLCH to sRGB, gamut mapping, WCAG contrast) is a small local file instead of a colour library.
- **Fonts in the playgrounds come from Google Fonts,** loaded on demand for comparing only. The app will host its fonts itself, because loading them from Google's servers sends visitors' IP addresses to Google (a German court found this a GDPR breach in 2022).
- **The boundary rules** allow stories to use devDependencies and allow peer dependencies in shipped code; the clean boundary fixture proves both.
- **Storybook deploys** as a static-files-only Worker, per PR and for `main`, in the Previews account.

### Added in M0 PR 6 (tokens)

In `packages/tokens`, as devDependencies:

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `@terrazzo/cli` | 2.10.0 | Builds the DTCG tokens (ADR 0008, ADR 0014) | 0.2 MB, plus `@terrazzo/parser` (0.6 MB) |
| `@terrazzo/plugin-css` | 2.10.0 | Writes them as CSS custom properties | 0.1 MB |

Nothing ships to the browser except the generated `tokens.css` (about 3 KB).

### Added in M0 PR 7 (UI foundation)

In `packages/ui`:

| Package | Version | Why | Size |
|---|---|---|---|
| `@base-ui/react` | 1.9.0 | Unstyled, accessible components (ADR 0008). Was `@base-ui-components/react` before 1.0 | 20 MB unpacked, but tree-shaken: the Button costs about 3 KB gzipped |
| `@storybook/addon-vitest` | 10.6.7 | Turns every story into a test (ADR 0015) | 0.6 MB |
| `vitest` | 5.1.0 | Runs those tests, the same version as `apps/web` | already installed |
| `@vitest/browser-playwright` | 5.1.0 | Runs them in a real browser | 0.1 MB, plus `@vitest/browser` (0.8 MB) |
| `playwright` | 1.65.1 | The browser driver it needs, the same version as `@playwright/test` in `apps/web` | 5 MB, plus `playwright-core` (already installed) |

Only Base UI is a runtime dependency; the rest are devDependencies. The Button isn't on any page yet, so the home page is unchanged at 113.4 KB.

### Added with the icons (ADR 0016)

No npm packages: `@thorbde/icons` builds with a script of our own. The drawing tool, which only agents run and not CI, needs Python with Shapely 2.2.0 and svgpathtools 1.8.0 (`packages/icons/tools/requirements.txt`).

### Added with the fonts (ADR 0017)

In `packages/ui`, as dependencies:

| Package | Version | Why | Size |
|---|---|---|---|
| `@fontsource/montserrat` | 5.3.0 | The interface font, self-hosted | About 19 KB per weight downloaded (Latin, WOFF2); we use two |
| `@fontsource/source-serif-4` | 5.3.1 | The essay font, self-hosted | About 20 KB per face downloaded; we use three |

### Added in M1 PR 3 (map geometry)

In `apps/web`, as a devDependency. It runs only in `scripts/build-maps.ts`; nothing from it reaches the Worker or the browser (the boundary rule against devDependencies in shipped code checks that). The generated map file is 2.0 MB gzipped (ADR 0020).

| Package | Version | Why | Unpacked size |
|---|---|---|---|
| `mapshaper` | 0.8.4 | The standard tool for preparing map data. Cuts one shape out of another, merges shapes, cuts them at the map's edge, simplifies while keeping shared borders identical, and rounds coordinates | 18 MB, and 171 MB installed with the 33 packages it depends on. MPL-2.0 |
| `d3-geo`, `@types/d3-geo` | 3.1.2, 3.1.1 | Tests only: the reference our Equal Earth maths is checked against (`equal-earth.test.ts`). Not in any bundle, and no longer used to build the map | 255 KB, plus `d3-array` (115 KB) and 30 KB of types |

- **The map data is not a package.** The script downloads Natural Earth 5.1.2's own files from its GitHub repository, pinned by version and by each file's SHA-256, into `apps/web/.cache/` (not committed). ADR 0020 says which files, what they provide and what they leave out.
- **What mapshaper provides:** every geometry step the script needs, as about ten commands.
- **What it leaves out:**
  - **Type definitions.** `scripts/mapshaper.d.ts` declares the one function we call.
  - **A documented way to move the map's edge that works.** Its documented commands lose the holes in countries when used for this. The script uses `-rotate`, which is in mapshaper but not in its documentation, and only works before simplifying. The tests would catch a change: every country present, Lesotho and San Marino still holes, no ring jumping across the map. **A known soft spot, which Thor accepted on 2026-11-17.** The fallback, if a mapshaper upgrade breaks it: bring back `d3-geo` (255 KB) for that one step, as the first version did.
- **It replaced** `world-atlas` 2.0.2 (Natural Earth 4.1.0, from 2018, with everything but the names and numeric codes stripped out), `topojson-client`, `topojson-simplify` and their type packages, `d3-geo` in the build script (it stays as a test reference, above), and about 400 lines of our own geometry code. Thor's decision of 2026-11-17: use Natural Earth's own files, and what the standard tools already do.
- **Alternatives:**
  - **Keep `topojson` and `d3-geo`, and only swap the data:** small packages, but they can't cut one shape out of another, which is what moving Crimea and Western Sahara needs. That part would stay our own code.
  - **Commit the source files instead of downloading them:** no network needed for `pnpm check`, but 30 MB in the repo.

### Added in M1 PR 4 (the map component)

In `apps/web`, as a dependency. It is the first package that is shipped to the browser but is not part of any page's first load.

| Package | Version | Why | Size |
|---|---|---|---|
| `maplibre-gl` | 6.18.0 | Draws the map (ADR 0021): Equal Earth as a custom projection, pan and zoom, labels, and later the globe | 296 KB gzipped, plus its 148 KB worker file and 10 KB of CSS. Measured from the production build |

- **It loads lazily,** after the page, and only in the browser: the file that uses it ends in `.client.ts`, so it is not in the Worker bundle either. The preview page's first load is 118 KB.
- **It has a size limit of its own:** 500 KB gzipped for MapLibre, its worker, its CSS and our own map code together (459 KB today, plus about 10%). `pnpm size` checks it, and also fails if the map engine ever becomes part of a page's first load.
- **MapLibre is a file of its own,** separate from our map code, and so is its worker. Their names only change when MapLibre is upgraded, so a returning visitor doesn't download them again after one of our deploys. Tried: a change to our map code changed our 3 KB file's name and left both of MapLibre's alone.
- **Used directly, not through `react-map-gl`:** there is one map, it never unmounts, and Equal Earth needs MapLibre's own API. One dependency fewer.
- **Labels are drawn by MapLibre with the page's own Montserrat.** Without a `glyphs` address in the style, MapLibre 6 draws text with the fonts the page has loaded. No font conversion, no glyph files, nothing extra to host.
- **MapLibre's licence** (BSD 3-clause) asks that its notice stays with the code. The build strips it from the JavaScript, so the full text is served at `/licenses/maplibre-gl.txt`; `pnpm size` checks that it is there and matches the installed version.
- **Vite has to be told to bundle MapLibre's worker file** (`?worker&url`, then `setWorkerUrl`). Without that it isn't served, and the map never starts.
- **e2e tests need WebGL.** Headless Chromium has no graphics card, so `playwright.config.ts` tells it to draw in software.

### Planned, not yet installed
Recorded here so the sizes are known before code depends on them (ADR 0006):

| Package | Version today | Where it runs | Unpacked size |
|---|---|---|---|
| `drizzle-orm` | 0.45.4 | Server only (the Worker) | 10.5 MB (only the D1 parts are bundled) |
| `drizzle-kit` | 0.31.11 | Development (generates migrations) | 10.3 MB |

Their effect on the Worker bundle is measured when they're added in M2.

**The map engine** (ADR 0021), added in M1 PR 4:

| Package | Version today | Where it runs | Size |
|---|---|---|---|
| `maplibre-gl` | 6.18.0 | The browser, loaded lazily after the page | About 296 KB gzipped, plus a worker file of about 150 KB and about 10 KB of CSS (measured on the draft thorbde/map-app#26, 2026-11-17) |

## Alternatives considered
- **React Router 7.18 (the last v7):** still maintained, but a dead end for a new project: we'd migrate to v8 within months.
- **ESLint + Prettier instead of Biome:** more plugins, but two tools, slower, and more configuration. ADR 0001 already chose Biome.
- **Preact instead of React** (to cut the browser JavaScript): about 4 KB instead of about 60 KB for the UI library, but React Router v8 framework mode, Base UI and CodeMirror integrations all assume React. A compatibility layer is a risk we'd rather not take on day one.
- **npm or Bun instead of pnpm:** pnpm's workspaces and strict dependency layout suit the design-system packages (ADR 0008).

## Consequences
- **The JavaScript budget is 150 KB gzipped on reading pages** (decided by Thor), replacing "under 100 KB". React and React Router alone are about 114 KB, so at most **~40 KB is ours**: our code, the map shell, pan and zoom, and any Base UI components a reading page uses. The editor's CodeMirror is outside the budget, since it loads only on `/write/*`.
- **The map engine is outside the first-load budget too** (ADR 0021, decided by Thor on 2026-11-16). MapLibre is about 296 KB gzipped, twice the whole budget, so it loads lazily after the page and gets a limit of its own: 500 KB, proposed in M1 PR 4 (thorbde/map-app#26). The "~40 KB is ours" figure no longer includes the map engine; it still covers our own code on reading pages.
- **Initial load stays fast** because pages are server-rendered: the page's text and the panel are visible before any JavaScript runs, and the JavaScript only makes them interactive. The map appears once its engine has loaded (ADR 0021). A size check in CI (added in M0 PR 2) will fail any PR that goes over the budget, and M5's Lighthouse CI also measures load and interactivity on a mid-range phone profile.
- **Upgrades are deliberate:** exact versions mean nothing changes until someone bumps it, ideally one tool per PR.
- **Biome formats Markdown too** since 2.6; it's switched off for `*.md` in `biome.json`, so the docs keep their hand-written formatting.
