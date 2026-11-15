# CLAUDE.md: rules for agents working in this repo

This app is built by agents and owned by Thor, a design systems engineer. Thor owns the decisions and the boundaries. Agents implement within them. When in doubt, ask instead of guessing.

## Read first, every session

1. `ARCHITECTURE.md`: structure, layers, boundaries
2. `docs/decisions/`: why things are the way they are
3. The spec for the task at hand, in `docs/specs/`

## The product in one paragraph

People learn about the countries of the world by writing short essays, one country at a time, following an evidence-based method (`docs/METHOD.md`). Each user has a world map that fills in as they publish. Profiles can be public or private. Social features come later (`docs/specs/roadmap.md`). The MVP is defined in `docs/specs/mvp.md`.

## Stack (see ADRs 0001, 0006, 0007, 0008, 0013)

React Router v8 (framework mode) · TypeScript strict · Cloudflare Workers · Cloudflare D1 (EU jurisdiction) · Drizzle ORM · Better Auth (Google sign-in) · CodeMirror 6 · remark/rehype + rehype-sanitize · Base UI · DTCG tokens + Terrazzo · CSS Modules · Vitest (Workers pool) · Playwright · Storybook · Biome · dependency-cruiser · knip · pnpm workspaces

Versions are pinned exactly; ADR 0013 lists every package, why it's there, and its size. Add new ones there too.

**Repo layout:** `apps/web/` is the app, `packages/tokens/` and `packages/ui/` are the design system (`@thorbde/tokens`, `@thorbde/ui`). Paths starting with `app/` are inside `apps/web/`.

Look up current docs for these libraries instead of relying on memory. Their APIs change fast.

## Commands

| Command | What |
|---|---|
| `pnpm dev` | Local dev on the Workers runtime |
| `pnpm check` | **Run before every commit:** typecheck + lint + boundaries + knip + unit tests |
| `pnpm test` / `pnpm test:e2e` | Unit and integration tests / Playwright |
| `pnpm storybook` | Design-system workbench (`packages/ui`) |
| `pnpm tokens` | Build the design tokens (`packages/tokens`) |
| `pnpm db:generate` | Generate a migration from the schema |
| `pnpm db:migrate` | Apply migrations to the **local** D1 only |
| `pnpm build:maps` | Regenerate the map geometry from Natural Earth |

## How to work

1. **Plan first.** For anything bigger than a small fix, write a short plan: files, approach, risks, tests. **Wait for approval** before writing code.
2. **Small PRs.** One vertical slice per branch (`feat/…`, `fix/…`, `chore/…`). If a PR touches more than ~15 files or more than one feature, split it.
3. **Fill in the PR template** (`.github/pull_request_template.md`) honestly, including risks and screenshots for UI changes.
   **Open PRs as drafts.** Mark a PR ready for review only when the definition of done is met: that starts the automated Claude review (ADR 0009). Fix or answer its findings before asking Thor to merge.
4. **Update the docs in the same PR.** If the structure changes, update `ARCHITECTURE.md`. If a decision is made, add an ADR.
5. **Definition of done:** `pnpm check` is green, the e2e tests touching the feature pass, the docs are updated, and the PR description is complete.

## Hard rules

- **Never weaken, skip or delete a test to make it pass.** If a test seems wrong, stop and explain why in the PR.
- **Never add a dependency without writing an ADR** (or adding to an existing one) that says why, what the alternatives were, and its size.
- **Never introduce a new pattern, service or architectural layer without an ADR.**
- **Never bypass `server/access.server.ts`** when reading another user's data. The UI never decides visibility.
- **Never cache viewer-dependent responses in a shared cache.** See ADR 0003.
- **Never render user markdown at request time, or with raw HTML enabled.** See ADR 0004.
- **Never build UI from scratch in a feature.** Compose from `@thorbde/ui`. If a component or token is missing, propose it in the PR and **ask Thor**. Thor approves all changes to `packages/`.
- **The design system never imports from the app.** `packages/*` must stay reusable in other apps (ADR 0008).
- **Never push to `main`, run migrations against production, or read production secrets.**
- **Never edit a migration that has been merged.** Write a new one.
- **Database access goes through Drizzle only,** with app-generated IDs and `db.batch()` for atomic writes (ADR 0006).
- **Don't import Cloudflare-specific APIs outside `app/server/platform/`.** The app must stay portable to Node.
- **YAGNI.** Build what the spec asks for. No speculative abstractions, no "while I'm here" refactors outside the PR's scope.

## Conventions

- **Server-only files end in `.server.ts`** so React Router keeps them out of client bundles.
- **Routes are thin:** parse the input, call a feature's service, return data. No SQL and no business logic in routes.
- **Validate with zod at every boundary:** form input, route params, JSON columns, webhooks, env.
- **Errors:** services throw typed errors from `app/lib/errors.ts`, and routes map them to responses.
- **Naming:** `camelCase` in TypeScript and `snake_case` in the database (Drizzle maps between them).
- **Accessibility is not optional.** Use semantic HTML, make everything keyboard-reachable, keep focus visible, and label everything. Base UI for interactive primitives.
- **Performance budgets:** at most 150 KB gzipped JS on reading pages, of which at most ~40 KB is our own code and the map (React and React Router are ~114 KB; ADR 0013), one database round trip per page where possible, and CodeMirror only on `/write/*`.
- **The UI copy is English.** Keep the tone friendly, short and concrete.

## When unsure

Ask. A short question is much cheaper than a wrong architectural guess.
