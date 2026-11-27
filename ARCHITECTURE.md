# Architecture

> Keep this file current. If a PR changes the structure, it updates this file.

## Overview

```
Browser
  │  HTML (SSR) + small route-split JS; MapLibre loads lazily after the page (ADR 0021); CodeMirror only on /write
  ▼
Cloudflare Worker (React Router v8, Smart Placement → runs near the DB)
  │
  ├─ app/routes/*            thin: parse input → call feature service → render
  │                          one layout route is the map shell: the map stays mounted,
  │                          child routes render the floating panel (ADR 0010)
  │       │
  │       ▼
  ├─ app/features/*/         business logic per feature (services, queries, components)
  │       │
  │       ├─ app/server/access.server.ts   ← the ONLY gate for reading other users' data
  │       ├─ app/server/db/                ← Drizzle schema + client
  │       └─ app/server/platform/          ← Cloudflare-specific adapters (env, D1 binding, rate limit)
  │
  └─ static assets (hashed, long-cached): JS/CSS, fonts, map geometry
        │
        ▼
Cloudflare D1 (SQLite, EU jurisdiction), see ADR 0006
```

External services: **Google OAuth** (the only sign-in method in the MVP, ADR 0007). That's all.

## Repository layout

The repo is a pnpm workspace (ADR 0008). The design system lives in its own packages and knows nothing about the app.

```
apps/
  web/                    the map app (everything under "Folder structure" below)
packages/
  tokens/                 @thorbde/tokens (ADR 0014): DTCG JSON in tokens/ (primitives, semantic)
                          → Terrazzo → generated/tokens.css (committed; checked by pnpm tokens:check)
  icons/                  @thorbde/icons (ADR 0016): our own icons. tools/ draws them (Python, agents only),
                          svg/ holds the approved drawings, generated/ the React components (checked by pnpm icons:check)
  ui/                     @thorbde/ui: Base UI components styled with CSS Modules, plus Storybook
    src/index.ts          the public API: apps import from "@thorbde/ui", never from src/ paths
    src/base.css          page basics (background, text, font, focus ring): "@thorbde/ui/base.css"
    src/fonts.css         the self-hosted fonts (ADR 0017): "@thorbde/ui/fonts.css"
    src/components/<Name>/  <Name>.tsx, <Name>.module.css, <Name>.stories.tsx (the stories are its tests, ADR 0015)
    src/foundations/      Storybook pages that show the tokens
    src/proposals/        stories that show a design in use with real content, and pieces not yet built as components, for Thor's review; never shipped or exported
    src/playgrounds/      Storybook playgrounds for design decisions (fonts, colour, type scale); never shipped or tested
docs/
  METHOD.md               The writing method (product content)
  decisions/              ADRs
  design/                 links to the design canvases and Storybook (README.md)
  specs/                  mvp.md, roadmap.md, future feature specs
```

The design system is owned by Thor. Every change to `packages/` needs his approval.

## Folder structure (`apps/web/`)

Paths in this file and in `CLAUDE.md` that start with `app/` are inside `apps/web/`.

```
app/
  root.tsx                the HTML document, top-level layout and error boundary
  routes.ts               the route table
  entry.server.tsx        server rendering (streams HTML)
  routes/                 React Router route modules (thin)
    preview.tsx           the map shell's layout route: the map and the continent chips, mounted once (ADR 0010)
    preview.world.tsx, preview.continent.tsx, preview.country.tsx   its child routes: each a loader and a panel
    preview.paths.ts      the shell's temporary addresses, in one place
    preview.map.tsx       the map component's own test page
  features/
    auth/                 Better Auth setup, onboarding, username rules
      auth.server.ts      Better Auth's settings: Google, the Drizzle adapter, rate limiting in the database, the OAuth Proxy on previews (ADR 0022), and the hooks that keep only name and email (ADR 0007)
      session.server.ts   sign in, sign out and getViewer() for routes; the forms post to our routes, which call Better Auth's own endpoints
      index.server.ts     the front door
    profiles/             profile, settings, visibility, export, delete account
    essays/               drafts, publishing, versions, rendering, editor
    maps/                 map components, geometry loading, written-state colouring
      geometry/world.json the generated map file: every country, at one level of detail (committed; checked by pnpm maps:check, ADR 0020)
      map-file.ts         the format of that file
      geometry/outlines/  the generated outlines on the panels' tiles: one small file per continent, and one of the six continents (committed; same check)
      outline-file.ts     the format of those files, and their size budget
      outline-land.ts     which land an outline shows: a country's main body with its nearby islands, starting from the map's own views
      outlines.server.ts  reads the outlines on the server, for a panel's loader: they arrive in the HTML, never as JavaScript
      index.server.ts     the feature's server-side front door: the outline readers, for the shell's loaders
      map-engine.client.ts  everything that touches MapLibre; loaded lazily by the map component, never on the server (ADR 0021)
      equal-earth.ts      the Equal Earth projection, registered with MapLibre (and with its workers: equal-earth.worker.ts)
      labels.ts           which country names show at which zoom, and which gives way: Natural Earth's zooms and ranks, handed to MapLibre
      views.ts            what the map can show (world, continent, country) and where the camera goes for it, clear of whatever covers the map (the `padding` prop)
      wait.ts             waiting for something, but not for ever (the map's first drawing)
      components/CountryMap.tsx  the map component, with its zoom buttons
    countries/            static country data, region lists and reference facts (no DB, ADR 0012),
                          and the panels that show them
      index.server.ts     the feature's server-side front door: the panels' data and the address checks
      panels.server.ts    the data behind the world, continent and country panels; the facts stay on the server
      format.ts           how facts read in the fact box
      schema.ts           what an address may name (zod)
      components/         WorldPanel, ContinentPanel, CountryPanel; PlaceList is the one place that turns
                          a list of places into shape tiles; the routes' loaders hand it the outlines from features/maps
  server/
    access.server.ts      canViewProfile / canViewEssay, see ADR 0003
    db/
      schema.ts           Drizzle schema (all tables; Better Auth's four exactly as its CLI generates them)
      client.server.ts    the Drizzle client for a D1 binding; only platform/ calls it
      migrations/         generated by drizzle-kit (pnpm db:generate), never edited once merged; meta/ is drizzle-kit's bookkeeping.
                          pnpm db:check fails if the schema has changes without a migration
    platform/             Cloudflare adapters; nothing else may import Workers APIs
      worker.ts           the Worker entry (wrangler's "main"): hands requests to React Router
      index.server.ts     the ONLY file other code may import from platform/: getDatabase() checks the
                          settings (zod) the first time it's called and returns the Drizzle client;
                          getAuthSettings() does the same for the sign-in settings
  lib/                    Shared pure utilities (errors, dates, zod helpers). No feature logic.
public/
  licenses/               licence texts that must be served with the code (MapLibre's)
scripts/
  check-bundle-size.mjs   the size budgets: each page's first load, the lazily loaded map engine, and the outline files (ADR 0013, ADR 0020, ADR 0021)
  build-maps.ts           Natural Earth's own files → mapshaper → country shapes and label fields as GeoJSON in features/maps/geometry/, and from the same shapes the tiles' outlines (border choices: ADR 0020)
  build-facts.ts          Wikidata + overrides → features/countries/facts.ts (monthly scheduled PR, reviewed before merge)
  facts-rules.ts          the pure rules behind it: picking values, validation, keeping the old value when Wikidata's is unusable
  wikidata-ids.ts         the Wikidata item for each country
drizzle.config.ts         where drizzle-kit finds the schema and writes migrations
tests/
  setup/database.ts       applies the migrations to each test file's own database
  integration/            Vitest in workerd: requests through the real Worker and React Router
  e2e/                    Playwright against the production build served locally
```

### Inside a feature

```
features/essays/
  index.ts                PUBLIC API for client-safe things (components, types)
  index.server.ts         PUBLIC API for server things (services)
  services.server.ts      business logic
  queries.server.ts       Drizzle queries (only this feature's tables)
  render.server.ts        markdown → sanitized HTML (at publish time)
  schema.ts               zod schemas for input and JSON columns
  components/             feature components, composed from @thorbde/ui
  *.test.ts
```

## Boundaries (enforced in CI)

**The idea:** every feature, and `server/platform/`, has a front door: its `index.ts` / `index.server.ts`. Everything else in that folder is internal. Other code may only import through the front door, the same way a design-system consumer uses a component's props and never its internal markup. That way internals can be refactored without breaking anything else.

| From | May import | May NOT import |
|---|---|---|
| `packages/tokens/` | nothing in the repo | `packages/ui/`, `apps/` |
| `packages/icons/` | nothing in the repo | `packages/ui/`, `apps/` |
| `packages/ui/` | `@thorbde/tokens`, `@thorbde/icons` | `apps/` |
| `app/routes/` | `features/*/index(.server).ts`, `@thorbde/ui`, `@thorbde/icons`, `lib/` | `server/db/`, another feature's internals |
| `app/features/X/` | its own files, `@thorbde/ui`, `@thorbde/icons`, `lib/`, `server/access`, `server/db`, `server/platform/index.server.ts`, other features' `index(.server).ts` | other features' internals, any other file in `server/platform/` |
| `app/lib/` | nothing app-specific | everything else |
| any client code | n/a | `*.server.ts` |
| anything outside `server/platform/` | n/a | `cloudflare:*`, Workers-specific globals |

**How each rule is enforced:**

- **dependency-cruiser** (`.dependency-cruiser.cjs`, run by `pnpm boundaries`): the design-system rules, feature and `server/platform/` front doors, routes not touching `server/db/`, `cloudflare:*` imports only in `server/platform/`, `lib/` staying generic, plus no circular imports, no unresolvable imports and no `devDependencies` in shipped code. Colocated tests (`*.test.ts`) may use `devDependencies` and `cloudflare:*` modules. `tests/boundaries/` has a fixture that breaks each rule, and a test proves every rule catches it.
- **React Router's build:** client code importing a `*.server.ts` file fails the build.
- **Not automated yet:** Workers-only globals (for example `HTMLRewriter` or `caches.default`). Their types are visible to all app code, so no tool stops them outside `server/platform/`; code review (and the Claude review) watches for them.
- **knip** (`pnpm knip`): unused files, exports and dependencies.

## Data model (MVP)

Stored in D1 (SQLite). To keep a later move to Postgres cheap (ADR 0006): IDs are generated in the app, timestamps are integers (Unix ms), JSON columns are text validated by zod, and all access goes through Drizzle.

- **Better Auth tables:** user, session, account, verification, and rate_limit (its rate-limit counts, migration 0001). We keep name and email; `user.image` and the token columns of `account` stay empty (ADR 0007).
- **profile:**
  - `user_id`, `username` (unique, reserved list), `display_name`, `bio`
  - `visibility` (`public` | `private`)
  - `current_continent`, `hidden` (admin), `essay_count`, `created_at`
  - `essay_count` is a denormalised copy of the number of **written** countries, as defined in ADR 0005 (has a latest version, isn't unpublished, isn't hidden). It is never incremented or decremented. It is **recomputed with a `COUNT`** in the same batch as any change that can affect it: publish, unpublish, an admin hiding or unhiding an essay, and deleting an essay.
- **essay:**
  - `id`, `user_id`, `iso`, `locale` (default `en`)
  - `draft_body`, `draft_data` (JSON), `draft_updated_at`
  - `latest_version_id`, `first_published_at`, `unpublished_at`, `hidden`
  - Unique on (`user_id`, `iso`, `locale`).
- **essay_version:** `id`, `essay_id`, `version_number`, `body`, `data` (JSON), `rendered_html`, `published_at`. Immutable.
- **invite_code:** `code`, `created_by`, `max_uses`, `uses`, `expires_at`. Used while `SIGNUP_MODE=invite`.
- **Admins** use Better Auth's admin plugin (`role` on user).

`data` / `draft_data` is validated by zod in `features/essays/schema.ts`. In the MVP it holds only what the writer writes besides the essay: the memory `hook`. Country facts are **reference data** in `features/countries`, not stored per essay (ADR 0012). Cities, recall questions and riddles are added later as **new optional fields**, never as a breaking change.

## Key flows

D1 has no interactive transactions. "Atomic" below means one `db.batch([...])`: every statement succeeds or none do (ADR 0006).

- **Publish:**
  1. validate the draft
  2. render markdown → sanitized HTML (ADR 0004)
  3. generate the new version's ID in the app
  4. atomically: insert `essay_version`, update `essay.latest_version_id`, set `first_published_at` if empty, clear `unpublished_at`, recompute `profile.essay_count` (see the data model: republishing an essay that's already written must not count it twice)
- **Read an essay:**
  1. load the owner's profile and the essay's latest version in one query
  2. `canViewEssay(viewer, owner, essay)`
  3. return the stored `rendered_html`
- **Map shell (ADR 0010):**
  1. the shell's layout route renders `<CountryMap>` once and keeps it mounted; it loads MapLibre lazily and draws our own country shapes (ADR 0021)
  2. each child route's loader checks its address and returns the panel's data plus the map view (world, continent or country) and, through `access.server.ts`, the list of written ISO codes the viewer may see. The layout reads the view from the deepest matching route. (In M1 there is no user data: the shell is at `/preview`, everyone counts as the owner and nothing is written)
  3. when the view changes, MapLibre moves the camera there with its own animation, and instantly for a visitor who prefers reduced motion; the shell says how much of the map its panel and its chips cover (`padding`, measured from the tokens), and views are framed in the rest
  4. the map geometry is one static hashed asset, the whole world in detail (ADR 0020); written and selected countries are coloured through MapLibre, with colours read from the tokens
  5. clicking a country navigates: for the owner, to the editor or the essay; for visitors, only written countries respond. The panel lists the same countries as real links
  6. the panel is the page's `<main>` and comes before the chips and the map; after a link is followed, focus moves to the new panel's heading

## Environments

| Env | Where | Database |
|---|---|---|
| local | `pnpm dev` (workerd). Google sign-in needs `apps/web/.dev.vars` (`.dev.vars.example` lists the settings); Google answers `localhost:5173` directly | Local D1 `memogra-local` (a SQLite file under `.wrangler/`), set up with `pnpm db:migrate`. It is bound as `DB` only in the `local` environment of `wrangler.jsonc`, which `pnpm dev`, the tests and `pnpm db:migrate` select; the deployed config has no database until M2 PR 2 |
| tests | Vitest in workerd (`@cloudflare/vitest-plugin`); Playwright against `vite preview` | An isolated D1 per test file, migrations applied by `tests/setup/database.ts`. Playwright's build has no database yet |
| preview | Two Workers per PR in the **separate Previews account**, deleted when the PR closes: the app (`map-app-pr-<number>`) and Storybook (`map-app-storybook-pr-<number>`). Storybook for `main` stays at `map-app-storybook`. **Sign-in:** Google answers only the fixed helper `memogra-main`, a copy of `main` deployed by `auth-helper.yml` with its own D1 `memogra-main`, which hands each sign-in to its preview (Better Auth's OAuth Proxy, ADR 0022). The sign-in settings are Worker secrets and vars set at deploy | A D1 per PR (`memogra-pr-<number>`, in the EU), created and migrated by CI and deleted when the PR closes. Can't reach production (ADR 0006). |
| production | `main` → `wrangler deploy` (CI only, GitHub `production` environment) | The production D1 (EU jurisdiction) |
