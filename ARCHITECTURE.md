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
  │       ├─ app/server/db/                ← Drizzle schema + client (Neon serverless driver)
  │       └─ app/server/platform/          ← Cloudflare-specific adapters (env, email, rate limit)
  │
  └─ static assets (hashed, long-cached): JS/CSS, fonts, map geometry
        │
        ▼
Neon Postgres (eu-central-1, Frankfurt)
```

External services: **Resend** (email), **Google OAuth**, **Turnstile** (bot check). That's all for the MVP.

## Folder structure

```
app/
  routes/                 React Router route modules (thin)
  ui/                     Design system, owned by Thor
    tokens.css            CSS custom properties: colour, space, type, radius, motion
    components/           Button, Field, Dialog, Menu, Tabs, Combobox… (Radix-based)
    *.stories.tsx         Storybook
  features/
    auth/                 Better Auth setup, onboarding, username rules
    profiles/             profile, settings, visibility, export, delete account
    essays/               drafts, publishing, versions, rendering, editor
    maps/                 map components, geometry loading, written-state colouring
    countries/            static country data + region lists (no DB)
  server/
    access.server.ts      canViewProfile / canViewEssay — see ADR 0003
    db/
      schema.ts           Drizzle schema (all tables)
      client.server.ts    DB client factory (per request)
      migrations/
    platform/             Cloudflare adapters; nothing else may import Workers APIs
  lib/                    Shared pure utilities (errors, dates, zod helpers). No feature logic.
scripts/
  build-maps.ts           Natural Earth → simplified static geometry
docs/
  METHOD.md               The writing method (product content)
  decisions/              ADRs
  specs/                  mvp.md, roadmap.md, future feature specs
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
  components/             feature components, composed from app/ui
  *.test.ts
```

## Boundaries (enforced by dependency-cruiser in CI)

| From | May import | May NOT import |
|---|---|---|
| `routes/` | `features/*/index(.server).ts`, `ui/`, `lib/` | `server/db/`, another feature's internals |
| `features/X/` | its own files, `ui/`, `lib/`, `server/access`, `server/db`, other features' **public** `index(.server).ts` | other features' internals, `server/platform/` internals except via its exported interface |
| `ui/` | `lib/` | `features/`, `server/`, `routes/` |
| `lib/` | nothing app-specific | everything else |
| any client code | — | `*.server.ts` |
| anything outside `server/platform/` | — | `cloudflare:*`, Workers-specific globals |

## Data model (MVP)

- **Better Auth tables:** user, session, account, verification.
- **profile:**
  - `user_id`, `username` (unique, reserved list), `display_name`, `bio`
  - `visibility` (`public` | `private`)
  - `current_continent`, `hidden` (admin), `essay_count` (denormalised), `created_at`
- **essay:**
  - `id`, `user_id`, `iso`, `locale` (default `en`)
  - `draft_body`, `draft_data` (jsonb), `draft_updated_at`
  - `latest_version_id`, `first_published_at`, `unpublished_at`, `hidden`
  - Unique on (`user_id`, `iso`, `locale`).
- **essay_version:** `id`, `essay_id`, `version_number`, `body`, `data` (jsonb), `rendered_html`, `published_at`. Immutable.
- **username_history:** `old_username`, `user_id`, `changed_at`. Powers the 30-day redirects and the reservation of old usernames.
- **invite_code:** `code`, `created_by`, `max_uses`, `uses`, `expires_at`. Used while `SIGNUP_MODE=invite`.
- **Admins** use Better Auth's admin plugin (`role` on user).

`data` / `draft_data` is validated by zod in `features/essays/schema.ts`. In the MVP it holds `hook`, `capital`, `languages[]`, `population`, `independence`, `government`, `neighbours[]`. Cities, questions and riddles are added later as **new optional fields**, never as a breaking change.

## Key flows

- **Publish:**
  1. validate the draft
  2. render markdown → sanitized HTML (ADR 0004)
  3. in one transaction: insert `essay_version`, update `essay.latest_version_id`, set `first_published_at` if empty, bump `profile.essay_count`
- **Read an essay:**
  1. load the owner's profile and the essay's latest version in one query
  2. `canViewEssay(viewer, owner, essay)`
  3. return the stored `rendered_html`
- **Map:** the static geometry (hashed asset) plus the list of written ISO codes per user. Colouring is done with CSS classes.

## Environments

| Env | Where | Database |
|---|---|---|
| local | `pnpm dev` (workerd) | Personal Neon dev branch |
| preview | Workers preview URL per PR | Neon branch per PR (created by CI) |
| production | `main` → `wrangler deploy` (CI only) | Neon main branch |
