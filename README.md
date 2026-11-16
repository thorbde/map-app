# Map app

Learn about the countries of the world by writing short essays, one country at a time, and watch your map fill in. The method behind it is in [`docs/METHOD.md`](docs/METHOD.md).

> Work in progress. We're in milestone M0 (foundation); see [`KICKOFF.md`](KICKOFF.md).

## Setup

You need **Node 22.22 or later** and **pnpm 10**.

```bash
corepack enable
```

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:5173.

For `pnpm test` and `pnpm test:e2e`, install Playwright's browser once with `pnpm --filter web exec playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_PATH` at a Chromium you already have. The app runs locally on `workerd`, the same runtime as Cloudflare Workers, so no Cloudflare account is needed for development.

## Commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the app locally |
| `pnpm build` | Builds the app for production |
| `pnpm typecheck` | Generates route and Worker types, then type-checks |
| `pnpm lint` | Checks linting and formatting with Biome |
| `pnpm format` | Fixes formatting and safe lint issues |
| `pnpm check` | Lint, typecheck, tokens in step with their JSON, import boundaries, knip and all tests except e2e. **Run before every commit.** |
| `pnpm tokens` | Builds the design tokens into CSS (`packages/tokens/generated/`); commit the result |
| `pnpm icons` | Builds the icon components from `packages/icons/svg/`; commit the result. How icons are drawn: `docs/design/icons.md` |
| `pnpm test` | Unit and integration tests inside workerd, component tests (every Storybook story in Chromium, with accessibility checks), plus the boundary-rule tests and the tests for the CI scripts |
| `pnpm boundaries` | Checks the import rules from ARCHITECTURE.md (dependency-cruiser) |
| `pnpm knip` | Finds unused files, exports and dependencies |
| `pnpm graph` | Prints the dependency graph as a Mermaid diagram |
| `pnpm test:e2e` | Playwright end-to-end tests against the production build, served locally |
| `pnpm storybook` | Opens Storybook: the design-system playgrounds and components (`packages/ui`) |
| `pnpm build:storybook` | Builds Storybook as static files |
| `pnpm size` | Checks each page's first-load JavaScript against the 150 KB budget (after `pnpm build`) |

## Continuous integration

Every PR runs:

- **CI (`check`):** lint, typecheck, import boundaries, knip, tests, build, and the JavaScript budget: at most 150 KB gzipped of first-load JavaScript per page (ADR 0013). `pnpm size` runs the same check locally after `pnpm build`.
- **CI (`e2e`):** Playwright against the production build, served locally on workerd.
- **Preview:** the PR's app and its Storybook, each deployed to its own Worker (`map-app-pr-<number>`, `map-app-storybook-pr-<number>`) in the separate Previews Cloudflare account. A comment on the PR links to both, and they're deleted when the PR closes (ADR 0006). Storybook for `main` stays up at `map-app-storybook`.
- **Claude review:** when a PR is marked ready for review, or when Thor comments `@claude` (ADR 0009).

## Repository layout

```
apps/web/        the app (React Router on Cloudflare Workers)
packages/tokens/ the design tokens (@thorbde/tokens): DTCG JSON and the generated CSS
packages/ui/     the design system's components and Storybook, with its playgrounds (@thorbde/ui)
docs/            the method, specs, decisions (ADRs) and design links
```

How the app is put together, and the rules for changing it, are in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`CLAUDE.md`](CLAUDE.md). Why things are the way they are is in [`docs/decisions/`](docs/decisions/).
