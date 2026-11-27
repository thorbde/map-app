# CLAUDE.md: rules for agents working in this repo

This app is built by agents and owned by Thor, a design systems engineer. Thor owns the decisions and the boundaries. Agents implement within them. When in doubt, ask instead of guessing.

## Read first, every session

1. `ARCHITECTURE.md`: structure, layers, boundaries
2. `DESIGN.md`: the design rules: the values, what's never allowed, and how to work on design. Read it before any design or UI work, and again when a session has run long
3. `docs/decisions/`: why things are the way they are
4. The spec for the task at hand, in `docs/specs/`

## The product in one paragraph

People learn about the countries of the world by writing short essays, one country at a time, following an evidence-based method (`docs/METHOD.md`). Each user has a world map that fills in as they publish. Profiles can be public or private. Social features come later (`docs/specs/roadmap.md`). The MVP is defined in `docs/specs/mvp.md`.

## Stack (see ADRs 0001, 0006, 0007, 0008, 0013, 0021)

React Router v8 (framework mode) · TypeScript strict · Cloudflare Workers · Cloudflare D1 (EU jurisdiction) · Drizzle ORM · Better Auth (Google sign-in) · CodeMirror 6 · MapLibre GL JS · remark/rehype + rehype-sanitize · Base UI · DTCG tokens + Terrazzo · CSS Modules · Vitest (Cloudflare Vitest plugin, tests run in workerd) · Playwright · Storybook · Biome · dependency-cruiser · knip · pnpm workspaces

Versions are pinned exactly; ADR 0013 lists every package, why it's there, and its size. Add new ones there too.

**Repo layout:** `apps/web/` is the app, `packages/tokens/`, `packages/icons/` and `packages/ui/` are the design system (`@thorbde/tokens`, `@thorbde/icons`, `@thorbde/ui`). Paths starting with `app/` are inside `apps/web/`.

Look up current docs for these libraries instead of relying on memory. Their APIs change fast.

## Commands

| Command | What |
|---|---|
| `pnpm dev` | Local dev on the Workers runtime |
| `pnpm check` | **Run before every commit:** lint + typecheck + tokens, icons, maps and migrations in step + boundaries + knip + tests |
| `pnpm boundaries` / `pnpm knip` | Import rules (dependency-cruiser) / unused files, exports and dependencies |
| `pnpm graph` | The dependency graph as a Mermaid diagram |
| `pnpm test` / `pnpm test:e2e` | Unit, integration and component tests (every story, with accessibility checks) / Playwright |
| `pnpm storybook` / `pnpm build:storybook` | Design-system workbench and playgrounds (`packages/ui`) / its static build |
| `pnpm tokens` | Build the design tokens (`packages/tokens`) after editing their JSON; commit the generated CSS |
| `pnpm icons` | Turn the icon SVGs into components (`packages/icons`); commit the result. Drawing icons: `docs/design/icons.md` |
| `pnpm db:generate` | Generate a migration from the schema |
| `pnpm db:migrate` | Apply migrations to the **local** D1 only |
| `pnpm build:facts` | Regenerate the country facts from Wikidata (needs network; the monthly job does this, ADR 0012) |
| `pnpm build:maps` | Regenerate the map geometry from Natural Earth; commit the result. Downloads the source once (about 30 MB; behind a proxy, set `NODE_USE_ENV_PROXY=1`). Border choices are in ADR 0020 |

## How to work

### Working faster (Thor, 2026-11-18)

After two days the app had a map and components but no sign-in, writing or publishing. Thor decided to work faster. These four rules win over anything older in `docs/specs/` that says otherwise.

1. **Product before polish.** The next stretch is a thin end-to-end slice: sign in → write one essay → publish → the country fills in on the map, with rough UI composed from existing `@thorbde/ui` components. Polish comes after the loop works. The plan is `docs/specs/slice.md`.
2. **Design review per whole screen, not per component.** One Storybook page or preview per screen, one round of feedback.
3. **Two tracks for PRs.**
   - **Strict:** accounts, privacy, access control, the database and migrations, anything under `packages/`, and the files that hold Thor's rules and decisions: `CLAUDE.md`, `DESIGN.md`, `ARCHITECTURE.md` and `docs/decisions/` (Thor, 2026-11-27). Plan first and wait for approval, open as a draft, the automated review, and Thor merges.
   - **Fast:** everything else (UI in `apps/web`, the specs in `docs/specs/` and other docs). No waiting for plan approval on small slices. The lead session may merge once CI is green and the automated review has no open findings.
   - **All hard rules below stay as they are,** on both tracks.
   - **"Before you build" applies on both tracks.** A fast-track plan still starts with "What already exists". If it would build our own version of something that exists, it needs the ADR that rule 2 asks for, and the PR moves to the strict track: Thor approves the plan before code.
4. **Workers are short-lived:** one per PR, at medium effort, one message to the lead when done or blocked, archived at merge.

### Steps

1. **Plan first.** For anything bigger than a small fix, write a short plan: files, approach, risks, tests. On the strict track, **wait for approval** before writing code. On the fast track, send the plan to the lead and carry on.
2. **Small PRs.** One vertical slice per branch (`feat/…`, `fix/…`, `chore/…`). If a PR touches more than ~15 files or more than one feature, split it.
3. **Fill in the PR template** (`.github/pull_request_template.md`) honestly, including risks and screenshots for UI changes.
   **Open PRs as drafts.** Mark a PR ready for review only when the definition of done is met: that starts the automated Claude review (ADR 0009). Fix or answer its findings before the merge (Thor's on the strict track, the lead's on the fast one).
4. **Update the docs in the same PR.** If the structure changes, update `ARCHITECTURE.md`. If a decision is made, add an ADR.
5. **Definition of done:** `pnpm check` is green, the e2e tests touching the feature pass, the docs are updated, and the PR description is complete.

## Before you build: what already exists

Three times in one session an agent built its own mechanism for something that already existed: levels of detail (MapLibre does it), a rule for small countries (Natural Earth ships label ranks), and label positions (Natural Earth ships those too). Thor caught each one. These rules exist so that the plan catches it instead.

1. **Every plan starts with a section called "What already exists",** with links. No plan is approved without it. It answers, in this order:
   - What does our **data source** already contain for this? List the fields.
   - What do the **libraries we use** already do for this?
   - How do **two established products** solve it?
   - Only then: what we build ourselves, and why nothing above fits.
2. **Building our own version of a solved problem needs an ADR** that names what exists and says why it isn't used. No ADR, no custom mechanism.
3. **When adopting a data source or a package, record what it provides and what it leaves out,** in the ADR that adds it. A package that strips data we may need is a reason to use the original.
4. **Two workarounds means stop.** If a feature needs a second fix for the same underlying problem, stop and re-check the approach instead of adding a third.

## Hard rules

- **Never weaken, skip or delete a test to make it pass.** If a test seems wrong, stop and explain why in the PR.
- **Never add a dependency without writing an ADR** (or adding to an existing one) that says why, what the alternatives were, and its size.
- **Never introduce a new pattern, service or architectural layer without an ADR.**
- **Never bypass `server/access.server.ts`** when reading another user's data. The UI never decides visibility.
- **Never cache viewer-dependent responses in a shared cache.** See ADR 0003.
- **Never render user markdown at request time, or with raw HTML enabled.** See ADR 0004.
- **Never build UI from scratch in a feature.** Compose from `@thorbde/ui` and `@thorbde/icons`. **Never add an icon library;** new icons are drawn with the icon tool and approved by Thor (`docs/design/icons.md`). If a component or token is missing, propose it in the PR and **ask Thor**. Thor approves all changes to `packages/`.
- **Never show Thor a design, or open a PR with UI in it, that breaks `DESIGN.md`.** Check it against the "Never" table first, and say in the PR that you did. If a rule seems wrong for a case, ask Thor; don't bend it quietly (ADR 0018).
- **The design system never imports from the app.** `packages/*` must stay reusable in other apps (ADR 0008).
- **Never push to `main`, run migrations against production, or read production secrets.**
- **Never edit a migration that has been merged.** Write a new one.
- **Database access goes through Drizzle only,** with app-generated IDs and `db.batch()` for atomic writes (ADR 0006).
- **Don't import Cloudflare-specific APIs outside `app/server/platform/`.** The app must stay portable to Node.
- **YAGNI.** Build what the spec asks for. No speculative abstractions, no "while I'm here" refactors outside the PR's scope.
- **Contested territory, recognition and international relations never hold the work up** (Thor, 2026-11-17). Prefer inclusion over exclusion, record every such choice as high risk in ADR 0019 (the country list) or ADR 0020 (the map), and carry on without asking. Thor revisits them all when the MVP is done.
- **Never reinvent what already exists** (Thor, 2026-11-17). Use what our data sources, our libraries and established products already do. It is more reliable and easier to maintain, and a little extra load time is an acceptable price (ADR 0021). The four rules under "Before you build" below are how this is checked.

## Conventions

- **Server-only files end in `.server.ts`** so React Router keeps them out of client bundles.
- **Routes are thin:** parse the input, call a feature's service, return data. No SQL and no business logic in routes.
- **Validate with zod at every boundary:** form input, route params, JSON columns, webhooks, env.
- **Errors:** services throw typed errors from `app/lib/errors.ts`, and routes map them to responses.
- **Naming:** `camelCase` in TypeScript and `snake_case` in the database (Drizzle maps between them).
- **Style with tokens, never raw values** (ADR 0014): colours and fonts through semantic tokens only (`var(--color-text-muted)`, `var(--font-ui)`); scales such as space, radius and font size directly (`var(--space-4)`).
- **Accessibility is not optional.** Use semantic HTML, make everything keyboard-reachable, keep focus visible, and label everything. Base UI for interactive primitives.
- **Performance budgets:** at most 150 KB gzipped of first-load JS on reading pages, of which at most ~40 KB is our own code (React and React Router are ~114 KB; ADR 0013), one database round trip per page where possible. The map engine (MapLibre) loads lazily with a limit of its own (ADR 0021), and CodeMirror only on `/write/*`.
- **The UI copy is English.** Keep the tone friendly, short and concrete.

## When unsure

Ask. A short question is much cheaper than a wrong architectural guess.
