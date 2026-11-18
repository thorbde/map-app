# The thin slice: sign in → write → publish → the map fills in

- **Written:** 2026-11-18, after Thor decided to work faster (`CLAUDE.md`, "Working faster").
- **Goal:** one signed-in person writes one essay, publishes it, and sees that country filled in on their own map. Rough UI, composed from what `@thorbde/ui` already has. Polish comes after the loop works.
- **Done when:** an e2e test (test-only sign-in) goes sign in → onboard → write → publish → the country is written on the map, and Thor does the same with Google on a preview.

## What already exists

### In the repo and in open PRs

| Piece | Where | State |
|---|---|---|
| 200 countries, facts, map geometry | M1 PRs 1–3 | Merged |
| `<CountryMap view written selected owner />`, camera, zoom buttons, keyboard | #26, #33 | Merged. `written` already colours countries; `owner` already makes every country clickable |
| `Panel`, `Chips`, `ShapeTiles`, `FactBox`, `Tag`, `TagLink`, `Button variant="link"` | #30 | Open, ready. Strict track (`packages/`) |
| Country and continent outlines for the tiles | #34 | Open, ready. Strict track (touches `packages/ui` stories) |
| The shell: one layout route keeps the map mounted; world, continent and country panels at `/preview/…` | #32 | Open, draft, stacked on #30 (holds #34) |
| Drizzle on a local D1, `getDatabase()`, Better Auth's four tables as migration 0000, `pnpm db:*` | #35 (M2 PR 1) | Open, draft. Strict track |
| `Button`, `Field` (label, description, error), `Link`, `Dialog`, `IconButton` | `@thorbde/ui` on `main` | Merged. **No multi-line text field** |
| Preview deploys per PR, tests in workerd, e2e on a local build | M0 | Merged |

### What `mvp.md` asks for, and what the slice keeps

| `mvp.md` | Kept in the slice | Cut for now |
|---|---|---|
| §3 Google sign-in, rate limiting, test-only sign-in | All of it (M2 PRs 3, 4) | — |
| §3 Invite codes | — | M2 PR 5, after the loop. Until then Google's consent screen stays in "Testing", so only test users Thor adds can sign in at all |
| §3 `/onboarding`, username and display name | All of it (M2 PR 6) | — |
| §4 `/write/:iso`, template headings, publish (render, sanitise, version) | Editor with the template headings, save draft, publish | Toolbar, live formatting, autosave, Facts and Template guide tabs, memory hook, word count, unpublish, delete |
| §5 `/u/:username` and the country page, through `access.server.ts` | The owner's own map and essay, through `access.server.ts` | Visitors, public maps, progress counts, recent essays, previous/next, Report |
| §6 Settings, §7 Admin | — | All |
| M1 PR 7, phone layout | — | All, polish |

### What the libraries already do

- **Better Auth, Drizzle, D1:** as in `m2.md`, "What the libraries already do". Nothing changes.
- **CodeMirror 6** (ADR 0011) with `@codemirror/lang-markdown` is an editor on its own: a bare setup gives a Markdown text area with keyboard and screen-reader support. The toolbar and live formatting are ours to add later.
- **remark → rehype → rehype-sanitize** (ADR 0004) is the whole publish pipeline. We configure it; we write none of it.
- **React Router** forms and actions save and publish with no client code of ours.

### How two established products do it

- **GitHub's issue and comment editor:** a plain text area that takes Markdown, and a button. Rich editing was added years later on top of the same text.
- **dev.to:** the editor is a Markdown text area with a "Publish" button. The rendered post is what readers get.

**What we take:** a plain Markdown editor and one Publish button first. The rich editor arrives on top of the same stored text, with no migration.

### What we build ourselves

The `essay` and `essay_version` tables, the publish service (ADR 0005), the owner-only checks in `access.server.ts` (ADR 0003), and the routes. All already designed in `ARCHITECTURE.md`; nothing here is a new mechanism.

## The PRs, in order

| # | PR | Track | Reuses | Scope | Cut for now |
|---|---|---|---|---|---|
| A | **Shell lands** | #30, #34: strict. #32: fast | #30, #34, #32 | Merge them as they are. No new work | — |
| 1 | **Database foundation** | Strict | M2 PR 1, #35 | As in #35 | — |
| 2 | **A database per PR preview** | Strict (database) | M2 PR 2 | As in `m2.md` | — |
| 3 | **Sign in with Google** | Strict | M2 PR 3 | As in `m2.md`, with a rough sign-in panel: `Panel` + `Button`, on `/` | Invite codes; the "G" logo (plain button text until Thor sees the screen) |
| 4 | **Test-only sign-in** | Strict | M2 PR 4 | As in `m2.md` | — |
| 5 | **Onboarding and username** | Strict | M2 PR 6 | As in `m2.md`: `profile` table, `/onboarding` with two `Field`s and a `Button` | Invite codes (M2 PR 5) |
| 6 | **Write and publish** | Strict (migration, privacy) | M3 core | `essay` + `essay_version` (one migration). `/write/:iso` in the shell's panel: bare CodeMirror with the template headings, "Save draft" and "Publish" as form actions. Publish: render, sanitise, store the version and recompute `essay_count` in one `db.batch()`. The XSS tests from ADR 0004 | Toolbar, autosave, side tabs, memory hook, word count, unpublish, delete |
| 7 | **My map fills in** | Strict (access control) | #32's shell | `/u/:username` and `/u/:username/country/:iso` for the owner: `canViewProfile` / `canViewEssay` in `access.server.ts`, owner-only (every map is "Only me" in the slice). `<CountryMap written>` from published essays; clicking a country opens the editor or the essay. `/` redirects a signed-in person to their map. The slice's e2e test | Visitors, the public setting, counts, recent essays, previous/next |

Six new PRs (2 to 7), plus #35, which is already written. Everything is strict except #32, because the slice is accounts, the database and access control. The fast track pays off in the polish that follows.

**Order and parallel work:**

- **A** runs now, beside everything.
- **1 → 3 → 4 → 5 → 6, one at a time:** 1, 3, 5 and 6 each add a migration.
- **2** runs beside 3 once 1 is merged. Thor needs it to try 3 on a preview.
- **7** starts once 5 and A are merged; its routes and `access.server.ts` can be built against 6's draft schema, and it merges after 6.
- **Thor's hand work** (below) runs beside 1 and 2, so it is ready when 3 is.

**One question for Thor, in PR 6's plan:** the editor in the slice is bare CodeMirror (recommended: ADR 0011's own library, no change to `packages/`), or a new multi-line `Field` in `@thorbde/ui` (a `packages/` change, and thrown away when CodeMirror arrives).

**Design review:** each screen (sign-in, onboarding, the editor, my map) is looked at once, on its PR's preview, when the loop works. Polish PRs follow, one per screen, on the fast track unless they touch `packages/`.

## What Thor does by hand

From `m2.md`, "What you create yourself", unchanged. Before PR 3 can be tried on a preview:

1. **A Google sign-in client for previews** in the Google Cloud console: project "Memogra previews", consent screen External, in "Testing", with Thor's own Google address as a test user; scopes `openid`, `email`, `profile`; a Web client with the two redirect addresses PR 3's plan gives.
2. **Three repository secrets:** `PREVIEW_GOOGLE_CLIENT_ID`, `PREVIEW_GOOGLE_CLIENT_SECRET`, `PREVIEW_AUTH_SECRET` (`openssl rand -base64 32`).
3. **Merge the strict-track PRs** (A's #30 and #34, then 1 to 7), and sign in with Google once on PR 3's and PR 7's previews.

Nothing touches production.

## Kickoff prompts

Every worker: one per PR, at medium effort, one message to the lead when done or blocked, archived at merge (`CLAUDE.md`, "Working faster").

### A. Shell lands

No worker. The lead merges #32 once #30 and #34 are merged by Thor, CI is green and the review has no open findings.

### 1. Database foundation (#35)

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `docs/specs/slice.md` and `docs/specs/m2.md` ("Where M2 stands"). The task is slice PR 1, the database foundation, already open as #35 on `feat/m2-database`. Bring it to done: `pnpm check` green, the automated review's findings fixed or answered, "Where M2 stands" updated. Strict track: Thor merges. Send the lead one message when it is ready or you are blocked.

### 2. A database per PR preview

> Read `CLAUDE.md`, `docs/specs/slice.md`, `docs/specs/m2.md` (row 2 of "The split", "Limits and costs") and ADR 0006. The task is slice PR 2, a D1 database per PR preview, in CI only. Strict track: write the plan, beginning with "What already exists", send it to the lead, and wait for approval. Work on `chore/preview-database`, open a draft PR, and never touch production. Send the lead one message when it is ready or you are blocked.

### 3. Sign in with Google

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/specs/slice.md` and `docs/specs/m2.md`, then ADRs 0003, 0006, 0007 and 0013. The task is slice PR 3, M2 PR 3, with the sign-in panel built rough from `Panel` and `Button` and no invite code (`slice.md`). Look up Better Auth's current docs (`m2.md`, "For the sessions that build this"). Strict track: plan first, beginning with "What already exists", with the exact redirect addresses for Thor, sent to the lead; wait for approval. Work on `feat/sign-in`, open a draft PR. Never read or create secrets. Send the lead one message when it is ready or you are blocked.

### 4. Test-only sign-in

> Read `CLAUDE.md`, `docs/specs/slice.md`, `docs/specs/m2.md` (row 4) and ADR 0007. The task is slice PR 4, the test-only sign-in on Better Auth's `testUtils`, behind every fence in ADR 0007. Strict track: plan first, beginning with "What already exists", sent to the lead; wait for approval. Work on `feat/test-sign-in`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 5. Onboarding and username

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/specs/slice.md` and `docs/specs/m2.md` (row 6, questions 3 and 4). The task is slice PR 5, M2 PR 6: the `profile` table, `/onboarding` with `Field` and `Button`, the reserved list for Thor to review in the PR. Strict track: plan first, beginning with "What already exists", sent to the lead; wait for approval. Work on `feat/onboarding`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 6. Write and publish

> Read `CLAUDE.md`, `ARCHITECTURE.md` (data model, "Publish an essay"), `DESIGN.md`, `docs/specs/slice.md`, `docs/specs/mvp.md` §4, and ADRs 0004, 0005, 0011 and 0013. The task is slice PR 6: the `essay` and `essay_version` tables, `/write/:iso` with a bare Markdown editor and the template headings, Save draft and Publish, and the publish pipeline with its XSS tests. Everything `slice.md` cuts stays out. Strict track: plan first, beginning with "What already exists" and with the editor question for Thor, sent to the lead; wait for approval. Work on `feat/write-publish`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 7. My map fills in

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/specs/slice.md`, `docs/specs/mvp.md` §5, ADRs 0003 and 0010, and PR #32's description. The task is slice PR 7: the owner's own `/u/:username` and country page on the shell, through `access.server.ts` (owner-only for now), the map's written countries from published essays, `/` redirecting a signed-in person, and the slice's end-to-end test. Strict track: plan first, beginning with "What already exists", sent to the lead; wait for approval. Work on `feat/my-map`, open a draft PR. Send the lead one message when it is ready or you are blocked.
