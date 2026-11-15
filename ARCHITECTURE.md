# Architecture

> Keep this file current. If a PR changes the structure, it updates this file.

## Overview

```
Browser
  │  HTML (SSR) + small route-split JS; CodeMirror only on /write
  ▼
Cloudflare Worker (React Router v7, Smart Placement → runs near the DB)
  │
  ├─ app/routes/*            thin: parse input → call feature service → render
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
  tokens/                 @thorbde/tokens: DTCG token JSON → Terrazzo → CSS custom properties + TS types
  ui/                     @thorbde/ui: Base UI components styled with CSS Modules, plus Storybook
docs/
  METHOD.md               The writing method (product content)
  decisions/              ADRs
  specs/                  mvp.md, roadmap.md, future feature specs
```

The design system is owned by Thor. Every change to `packages/` needs his approval.

## Folder structure (`apps/web/`)

Paths in this file and in `CLAUDE.md` that start with `app/` are inside `apps/web/`.

```
app/
  routes/                 React Router route modules (thin)
  features/
    auth/                 Better Auth setup, onboarding, username rules
    profiles/             profile, settings, visibility, export, delete account
    essays/               drafts, publishing, versions, rendering, editor
    maps/                 map components, geometry loading, written-state colouring
    countries/            static country data + region lists (no DB)
  server/
    access.server.ts      canViewProfile / canViewEssay, see ADR 0003
    db/
      schema.ts           Drizzle schema (all tables)
      client.server.ts    DB client factory (per request)
      migrations/
    platform/             Cloudflare adapters; nothing else may import Workers APIs
      index.server.ts     the ONLY file other code may import from platform/
  lib/                    Shared pure utilities (errors, dates, zod helpers). No feature logic.
scripts/
  build-maps.ts           Natural Earth → simplified static geometry
tests/
  e2e/                    Playwright
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

## Boundaries (enforced by dependency-cruiser in CI)

**The idea:** every feature, and `server/platform/`, has a front door: its `index.ts` / `index.server.ts`. Everything else in that folder is internal. Other code may only import through the front door, the same way a design-system consumer uses a component's props and never its internal markup. That way internals can be refactored without breaking anything else.

| From | May import | May NOT import |
|---|---|---|
| `packages/tokens/` | nothing in the repo | `packages/ui/`, `apps/` |
| `packages/ui/` | `@thorbde/tokens` | `apps/` |
| `app/routes/` | `features/*/index(.server).ts`, `@thorbde/ui`, `lib/` | `server/db/`, another feature's internals |
| `app/features/X/` | its own files, `@thorbde/ui`, `lib/`, `server/access`, `server/db`, `server/platform/index.server.ts`, other features' `index(.server).ts` | other features' internals, any other file in `server/platform/` |
| `app/lib/` | nothing app-specific | everything else |
| any client code | n/a | `*.server.ts` |
| anything outside `server/platform/` | n/a | `cloudflare:*`, Workers-specific globals |

## Data model (MVP)

Stored in D1 (SQLite). To keep a later move to Postgres cheap (ADR 0006): IDs are generated in the app, timestamps are integers (Unix ms), JSON columns are text validated by zod, and all access goes through Drizzle.

- **Better Auth tables:** user, session, account, verification.
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

`data` / `draft_data` is validated by zod in `features/essays/schema.ts`. In the MVP it holds `hook`, `capital`, `languages[]`, `population`, `independence`, `government`, `neighbours[]`. Cities, questions and riddles are added later as **new optional fields**, never as a breaking change.

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
- **Map:** the static geometry (hashed asset) plus the list of written ISO codes per user. Colouring is done with CSS classes.

## Environments

| Env | Where | Database |
|---|---|---|
| local | `pnpm dev` (workerd) | Local D1 (a SQLite file under `.wrangler/`) |
| tests | Vitest Workers pool | An isolated D1 per test file, migrations applied |
| preview | Workers preview URL per PR | A D1 per PR, created by CI and deleted when the PR closes. Never the production database. |
| production | `main` → `wrangler deploy` (CI only) | The production D1 (EU jurisdiction) |
