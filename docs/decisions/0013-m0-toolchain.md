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

### Planned, not yet installed
Recorded here so the sizes are known before code depends on them (ADR 0006):

| Package | Version today | Where it runs | Unpacked size |
|---|---|---|---|
| `drizzle-orm` | 0.45.4 | Server only (the Worker) | 10.5 MB (only the D1 parts are bundled) |
| `drizzle-kit` | 0.31.11 | Development (generates migrations) | 10.3 MB |

Their effect on the Worker bundle is measured when they're added in M2.

## Alternatives considered
- **React Router 7.18 (the last v7):** still maintained, but a dead end for a new project: we'd migrate to v8 within months.
- **ESLint + Prettier instead of Biome:** more plugins, but two tools, slower, and more configuration. ADR 0001 already chose Biome.
- **Preact instead of React** (to cut the browser JavaScript): about 4 KB instead of about 60 KB for the UI library, but React Router v8 framework mode, Base UI and CodeMirror integrations all assume React. A compatibility layer is a risk we'd rather not take on day one.
- **npm or Bun instead of pnpm:** pnpm's workspaces and strict dependency layout suit the design-system packages (ADR 0008).

## Consequences
- **The JavaScript budget is 150 KB gzipped on reading pages** (decided by Thor), replacing "under 100 KB". React and React Router alone are about 114 KB, so at most **~40 KB is ours**: our code, the map shell, pan and zoom, and any Base UI components a reading page uses. The editor's CodeMirror is outside the budget, since it loads only on `/write/*`.
- **Initial load stays fast** because pages are server-rendered: the text and the map's SVG are visible before any JavaScript runs, and the JavaScript only makes them interactive. A size check in CI (added in M0 PR 2) will fail any PR that goes over the budget, and M5's Lighthouse CI also measures load and interactivity on a mid-range phone profile.
- **Upgrades are deliberate:** exact versions mean nothing changes until someone bumps it, ideally one tool per PR.
- **Biome formats Markdown too** since 2.6; it's switched off for `*.md` in `biome.json`, so the docs keep their hand-written formatting.
