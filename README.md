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

Then open http://localhost:5173. The app runs locally on `workerd`, the same runtime as Cloudflare Workers, so no Cloudflare account is needed for development.

## Commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the app locally |
| `pnpm build` | Builds the app for production |
| `pnpm typecheck` | Generates route and Worker types, then type-checks |
| `pnpm lint` | Checks linting and formatting with Biome |
| `pnpm format` | Fixes formatting and safe lint issues |
| `pnpm check` | Lint + typecheck. **Run before every commit.** It grows as M0 adds tests, boundaries and knip. |

## Repository layout

```
apps/web/        the app (React Router on Cloudflare Workers)
packages/        the design system: @thorbde/tokens and @thorbde/ui (from M0 PR 5)
docs/            the method, specs, decisions (ADRs) and design links
```

How the app is put together, and the rules for changing it, are in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`CLAUDE.md`](CLAUDE.md). Why things are the way they are is in [`docs/decisions/`](docs/decisions/).
