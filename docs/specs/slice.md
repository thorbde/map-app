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
| `Panel`, `Chips`, `ShapeTiles`, `FactBox`, `Tag`, `TagLink`, `Button variant="link"` | #30 | Merged (2026-11-27) |
| Country and continent outlines for the tiles | #34 | Merged |
| The shell: one layout route keeps the map mounted; world, continent and country panels at `/preview/…` | #32 | Open, ready |
| Drizzle on a local D1, `getDatabase()`, Better Auth's four tables as migration 0000, `pnpm db:*` | #35 (M2 PR 1) | Merged |
| A database per PR preview; Google sign-in, `getViewer()`, the rate-limit table (migration 0001), the sign-in helper for previews | #37, #38 (M2 PRs 2, 3) | Merged |
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
| 7 | **My map fills in** | Strict (access control) | #32's shell | `/u/:username` and `/u/:username/country/:iso` for the owner: `canViewProfile` / `canViewEssay` in `access.server.ts` (decision 8; every map is "Only me" in the slice). `<CountryMap written>` from published essays; clicking a country opens the editor or the essay. `/` redirects a signed-in person to their map. The slice's e2e test | Visitors, the public setting, counts, recent essays, previous/next |

Six new PRs (2 to 7), plus #35, which is already written. Everything is strict except #32, because the slice is accounts, the database and access control. The fast track pays off in the polish that follows.

**Order and parallel work** (updated 2026-11-27; proposed to Thor in the PR that wrote it, see "Decisions for Thor", 10). Only PRs that add a migration queue behind each other; everything else runs beside them.

- **A:** #30 and #34 are merged; #32 is ready and lands beside everything.
- **1, 2 and 3 are merged** (#35, #37, #38).
- **4 and 5 run now, side by side.** 4 adds no migration. 5 adds migration 0002. 5's unit and integration tests don't need 4; its e2e test does, so 5 rebases on 4 before it merges.
- **6 and 7 are built now, against a draft schema,** and merge in order 5 → 6 → 7. 6 adds migration 0003 on top of 5's; if 5's schema changes in review, 6 regenerates its migration (it is unmerged, so that is allowed). 7 adds no migration; it builds on 6's branch and merges after 6.
- **Files more than one PR touches,** so whoever merges second rebases:

| File | PRs |
|---|---|
| `app/routes.ts` | 4, 5, 6, 7 (one line each) |
| `app/server/db/schema.ts`, `app/server/db/migrations/` | 5, 6 |
| `app/server/platform/index.server.ts` (settings) | 4 |
| `app/routes/home.tsx` (where `/` sends a signed-in person) | 5, 7 |
| `app/routes/write.$iso.tsx` (where Publish goes next) | 6, 7 |
| `tests/e2e/` sign-in helper | made in 4, used by 5, 6, 7 |
| `ARCHITECTURE.md` (data model, flows) | 5, 6, 7 |
| `docs/decisions/0013-m0-toolchain.md` (packages) | 6 |
| `docs/specs/m2.md`, "Where M2 stands" | 4, 5 |

**Design review:** each screen (sign-in, onboarding, the editor, my map) is looked at once, on its PR's preview, when the loop works. Polish PRs follow, one per screen, on the fast track unless they touch `packages/`. Nothing below decides a design question in text; where a screen is mentioned, it is the rough version, composed from what `@thorbde/ui` has.

## Plans for PRs 4 to 7

Written 2026-11-27, for Thor to approve together in one sitting. If he approves them and the batch rule (decision 10), the workers build without a separate plan approval each. Each still opens a draft, gets the automated review, and Thor merges. The questions are collected under "Decisions for Thor" below.

### Plan for PR 4: test-only sign-in

**What already exists**
- **Data:** Better Auth's `user` and `session` tables (migration 0000). A test user needs `name` and `email`; nothing else.
- **Libraries:** Better Auth's [Test Utils plugin](https://www.better-auth.com/docs/plugins/test-utils) (`testUtils`, in `better-auth` 1.7.28, no new package): `createUser`, `saveUser`, and `login({ userId })`, which makes a real session and returns its signed cookies and headers. **It adds no route of its own**, and its docs advise keeping it out of the production auth config, in a separate test-only instance. Playwright's `request` and `context.addCookies` take the cookies.
- **Two products:** Supabase's local stack signs test users in through an admin API that exists only on the local instance. Auth.js documents a Credentials provider enabled only when an environment flag is set, for e2e tests.
- **What we build:** the one route that `testUtils` leaves to us (it has none), and the fences ADR 0007 asks for. No cookie or session code of ours: Better Auth makes both.

**Files:** `app/features/auth/test-sign-in.server.ts` (a second Better Auth instance: `createAuth`'s options plus `testUtils()`), `app/routes/test.sign-in.ts`, `app/routes.ts`, `app/server/platform/index.server.ts` (an optional `AUTH_TEST_MODE: "1"` in the settings' zod schema), `playwright.config.ts` (sets the flag for the local server only), `tests/e2e/sign-in.ts` (a helper), the CI check, ADR 0007 (the final design).

**Approach:** `POST /test/sign-in` with `{ email, name }`. It answers 404 unless `AUTH_TEST_MODE=1` **and** the request's host is `localhost` or `127.0.0.1`; both checks come before anything is read. Then the test instance finds or saves the user, calls `login`, and returns its `Set-Cookie` headers. The production instance never loads `testUtils`; the test instance is built only inside the route, after the fences. A CI step fails if `AUTH_TEST_MODE` appears in `wrangler.jsonc` or in any deploy workflow.

**Migration:** none.

**Tests:** integration: 404 without the flag; 404 with the flag on any other host; with both, a cookie that `getViewer` accepts; a second call for the same email reuses the user. The CI check fails on a planted flag (one test of the check script). e2e: the first test that signs in and sees the signed-in panel.

**Risks:** it is a way around sign-in. The fences are the flag, the host check, the CI check, and e2e only ever running against a local build (`playwright.config.ts`, ADR 0007). The `Host` header is set by the client, so the host check alone is not enough; the flag never existing on a deployed Worker is what holds.

**Cut for now:** nothing.

**Thor by hand:** nothing. Reviewing the fences in the PR is the check, when it suits him.

### Plan for PR 5: onboarding and username

**What already exists**
- **Data:** Better Auth's `user.name` (from Google) pre-fills the display name. `ARCHITECTURE.md` already lists every `profile` column.
- **Libraries:** Better Auth's `username` plugin, not used (m2.md, question 4, decided A). D1's unique index is the guarantee that no two people share a username, even in a race. zod checks the rules. React Router's form and action handle the form with no client code.
- **Two products:** GitHub asks for the username during sign-up, with the rules shown beside the field. Bluesky has the handle picked in the same step as the account. Both are one short step, which is what we take.
- **What we build:** the `profile` table, the username rules and the reserved list (about 30 lines, as question 4 said), the `/onboarding` route, and the rule that a signed-in person without a profile is sent there. The ADR that question 4 asks for (why not the plugin) is part of this PR.

**Files:** `app/server/db/schema.ts`, migration `0002_profile.sql`, `app/features/profiles/` (`username.ts` with the rules and reserved list, `profiles.server.ts` with `createProfile` and `getProfileForUser`, `index.server.ts`), `app/routes/onboarding.tsx`, `app/routes/home.tsx`, `app/routes.ts`, a new ADR (usernames), `ARCHITECTURE.md`, m2.md "Where M2 stands".

**Approach:** `profile` keyed by `user_id` (deleted with the user), with every column `ARCHITECTURE.md` lists, so the MVP needs no second profile migration: `visibility` starts `private` (question 3), `essay_count` 0, `hidden` false. `/onboarding` is a `Panel` with two `Field`s and a `Button`. The action validates with zod; a clash on the unique index becomes a typed `UsernameTaken` error and the field's error text. Signed-in loaders call one helper that returns the viewer and their profile, or sends them to `/onboarding`. `/onboarding` with a profile already sends them on (to `/` until PR 7).

**Migration:** 0002, `profile`, with a unique index on `username`.

**Tests:** unit: the username rules and every reserved word (mvp.md §3). Integration: create a profile; two people taking one username at the same moment get one profile and one `UsernameTaken`; a signed-out request to `/onboarding` goes to `/`; a person with no profile is sent to `/onboarding` from `/`. e2e (after PR 4): sign in → onboard → back on `/` with a username.

**Risks:** usernames can't be changed in the MVP, so the rules and reserved list can be loosened later but never tightened. Reading the profile is a second query after the session check; two round trips on signed-in pages, measured in the PR.

**Cut for now:** invite codes (M2 PR 5), bio, changing the username, a live "is it free?" check.

**Thor by hand:** reads the reserved list in the PR before merging (it can't be tightened later), and onboards once with Google on the preview.

### Plan for PR 6: write and publish

**What already exists**
- **Data:** ADR 0005's `essay` and `essay_version`, with every column in `ARCHITECTURE.md`; the twelve template headings in mvp.md §4; the 200 countries in `features/countries` (the ISO codes `/write/:iso` accepts).
- **Libraries:** [CodeMirror 6](https://codemirror.net/docs/guide/): the `codemirror` package's `basicSetup` and `@codemirror/lang-markdown` are a complete Markdown editor with keyboard and screen-reader support; its docs mount it with `new EditorView({ parent })`, no wrapper package needed. The publish pipeline is [unified](https://unifiedjs.com/): `remark-parse` → `remark-rehype` (raw HTML off by default) → `rehype-sanitize` (GitHub's schema, images removed) → `rehype-external-links` (sets `rel` and `target`, so we don't) → `rehype-stringify`. Drizzle's `db.batch()` makes publishing atomic.
- **Two products:** GitHub's comment editor and dev.to's editor: a Markdown text area and one button (see "How two established products do it" above).
- **What we build:** the two tables, the publish service (ADR 0005), and the route. We configure the pipeline and write none of it.

**Files:** `app/server/db/schema.ts`, migration `0003_essays.sql`, `app/features/essays/` (`template.ts`, `render.server.ts`, `essays.server.ts`, `schema.ts` for the `data` JSON, `Editor.tsx` (client only, loaded lazily), `index.server.ts`), `app/routes/write.$iso.tsx`, `app/routes.ts`, `apps/web/package.json`, ADR 0013 (packages and sizes), `ARCHITECTURE.md`.

**Approach:** `/write/:iso` in the shell's panel (#32): a `Panel` with the editor and two `Button`s, "Save draft" and "Publish", in one form. The editor keeps a hidden `body` input in step, so both are plain form actions. The loader reads the viewer's own essay by `(user_id, iso)`, or offers the template headings when there is none; the essay row is created on the first save. **Publish**, in one `db.batch()`: insert `essay_version` (number = latest + 1, unique per essay), point `essay.latest_version_id` at it, set `first_published_at` once, and recompute `profile.essay_count` with a `COUNT` (ARCHITECTURE.md). Then a "Published" line in the panel; PR 7 turns it into a link to the essay. Only the viewer's own essay is ever read or written, so `access.server.ts` isn't needed here; every response is `private, no-store`.

**Migration:** 0003, `essay` (unique on `user_id, iso, locale`) and `essay_version` (unique on `essay_id, version_number`).

**Tests:** unit: the ADR 0004 cases (`<script>`, `javascript:` links, `on*` attributes, raw HTML and images all come out inert or gone; links get `rel` and `target`). Integration: save a draft; publish makes version 1, then 2; `essay_count` follows; a batch that fails halfway writes nothing; two people's essays on one country stay apart; signed out goes to `/`, no profile goes to `/onboarding`; an unknown ISO is a 404. e2e (after 4 and 5): sign in → onboard → `/write/SE` → type → Publish → "Published".

**Risks:** the Worker bundle grows by the pipeline, and publishing costs CPU (the free plan's 10 ms); both measured in the PR. CodeMirror must stay out of reading pages (checked against the budget). Without JavaScript there is no editor in the slice.

**Cut for now:** toolbar, live formatting, autosave, Facts and Template guide tabs, memory hook, word count, unpublish, delete; and two parts of ADR 0004 (decision 7): `<details>` around two sections, and tables (`remark-gfm`).

**Thor by hand:** writes and publishes one essay on the preview.

### Plan for PR 7: my map fills in

**What already exists**
- **Data:** a country is **written** when its essay has a latest version, isn't unpublished and isn't hidden (ADR 0005); the stored `rendered_html` (ADR 0004); the facts for `FactBox` (ADR 0012).
- **Libraries and our components:** `<CountryMap written owner selected view>` already colours written countries and makes every country clickable for the owner (#26, #33). #32's layout route keeps the map mounted while panels change. `Panel`, `FactBox`, `Button`, `Link` from `@thorbde/ui`. React Router nested routes and loaders.
- **Two products:** Polarsteps and the "Been" app both fill in a personal world map as you add countries, and open a country's page when you tap it. Strava keeps every new activity private until the person says otherwise, the stance question 3 took.
- **What we build:** `server/access.server.ts` (ADR 0003's two functions), the profile and country routes on the shell, and the query for written countries. All designed in ADR 0003 and `ARCHITECTURE.md`.

**Files:** `app/server/access.server.ts`, `app/features/profiles/profiles.server.ts` (by username, written ISOs), `app/features/essays/essays.server.ts` (the published essay), `app/routes/u.$username.tsx`, `app/routes/u.$username.country.$iso.tsx`, `app/routes/home.tsx`, `app/routes/write.$iso.tsx` (link after publishing), `app/routes.ts`, a CSS module for the essay's text, `tests/e2e/slice.spec.ts`, `ARCHITECTURE.md`.

**Approach:** `/u/:username`: the loader reads the profile and its written ISOs in one `db.batch()`, asks `canViewProfile`, and hands `written` to the map. `/u/:username/country/:iso`: asks `canViewEssay`, and shows the `FactBox`, the stored HTML, and for the owner an "Edit" `Button` to `/write/:iso`. Clicking a country: written → its page, not written → the editor (owner only). `/` sends a signed-in person to their map. Anyone else sees only the display name, the username and "This map is private." (ADR 0003), also in `<title>` and meta tags. Every response is `private, no-store`.

**Migration:** none (6 has every column).

**Tests:** integration: ADR 0003's matrix, {owner, other user, logged out} × {private, public, hidden profile} × {draft, published, unpublished, hidden essay}, with public and hidden set directly in the test database since nothing sets them yet (admins come later, so their row waits). A route test: another user gets the private message, no essay HTML, and `no-store`. e2e: the slice's test (sign in → onboard → write → publish → the country is written on the map), and a logged-out visitor learns nothing from a private map's pages or titles.

**Risks:** the highest in the slice: the first page that could show one person's data to another. The matrix test is the safety net. The stored HTML goes into the page as it is; it is safe only because it was sanitised at publish, so no other path may write `rendered_html`.

**Cut for now:** visitors' views beyond "This map is private", the visibility setting, counts, recent essays, previous/next, continents, Report.

**Thor by hand:** the "done when" above: the whole loop with Google on the preview.

## Decisions for Thor

All four plans in one sitting. Each has a recommendation; "as recommended" approves them all.

1. **PR 4, the shape of the test sign-in.** (a) A localhost-only `POST /test/sign-in` that uses Better Auth's `testUtils` in a separate, test-only instance. (b) Playwright writes sessions into the local database itself. **Recommended: (a).** (b) would rebuild Better Auth's signed cookies ourselves.
2. **PR 5, the display name's rule.** **Recommended:** 1 to 50 characters after trimming, any script. mvp.md doesn't say; it can be loosened later.
3. **PR 6, the editor in the slice.** (a) Bare CodeMirror, ADR 0011's own library, no change to `packages/`. (b) A new multi-line `Field` in `@thorbde/ui`, thrown away when CodeMirror arrives. **Recommended: (a).**
4. **PR 6, new packages** (each recorded in ADR 0013 with its size): `codemirror`, `@codemirror/lang-markdown` (ADR 0011); `unified`, `remark-parse`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify` (ADR 0004); and `rehype-external-links`, which ADR 0004 doesn't name: it sets the links' `rel` and `target` so we don't write that ourselves. No React wrapper for CodeMirror: its docs mount it in a few lines. **Recommended: approve all eight.**
5. **PRs 6 and 7, where the editor's and the essay's styles live in the slice.** ADR 0011 gives the editor's look to the design system, and there is no prose component. (a) A CSS module in `apps/web`, tokens only, moved into `@thorbde/ui` as `Editor` and `Prose` in the polish PRs. (b) Add both to `packages/ui` now (strict, your approval of each). **Recommended: (a),** said so in each PR; you see both screens on the preview.
6. **PR 6, status text** ("Saved", "Published"): plain text in the panel, no new component. **Recommended: yes.** A notice component, if one is wanted, is proposed in polish.
7. **PR 6, two parts of ADR 0004 wait:** the `<details>` around "What I got wrong" and "Before I started", and tables. Rendered HTML is stored, so essays published without them would need re-rendering later (ADR 0004). Only test essays on previews exist before production (M5), and preview databases are deleted with their PRs, so nothing needs re-rendering. **Recommended: cut them from the slice;** they come with the toolbar.
8. **PR 7, how much of `access.server.ts`.** (a) ADR 0003's rules as written (owner; hidden; public; private) and its test matrix, without the admin exception (no admins yet). Every profile is private in the slice, so the behaviour is still owner-only. (b) Owner-only, as this file first said. **Recommended: (a).** It is a few lines more, and the matrix tests the real rules from the start.
9. **PR 7, clicking a country on your own map:** written → its essay page, not written → the editor. **Recommended: yes,** as above.

10. **The working rules behind this file** (relayed to the lead on 2026-11-27, not yet in `CLAUDE.md`): one approval for a batch of strict-track plans; PRs in parallel where they don't collide, only migrations queue; workers interrupt Thor only for blockers and decisions. **Recommended:** Thor adds them to `CLAUDE.md` himself, or tells the lead to, since they change his own approval gates. Until then, each plan above waits for its own approval as `CLAUDE.md` says.

Screens (sign-in, onboarding, the editor, my map) are shown on their previews when the loop works, one review per screen; none is decided here.

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

> Read `CLAUDE.md`, `docs/specs/slice.md`, `docs/specs/m2.md` (row 4) and ADR 0007. The task is slice PR 4, the test-only sign-in on Better Auth's `testUtils`, behind every fence in ADR 0007. Strict track: its plan is in `slice.md`, "Plans for PRs 4 to 7", approved with Thor's answers to "Decisions for Thor". Build to it without a separate plan approval if Thor approved the batch rule (decision 10), otherwise wait for his approval of this plan; if the plan turns out wrong, stop and tell the lead. Work on `feat/test-sign-in`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 5. Onboarding and username

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/specs/slice.md` and `docs/specs/m2.md` (row 6, questions 3 and 4). The task is slice PR 5, M2 PR 6: the `profile` table, `/onboarding` with `Field` and `Button`, the reserved list for Thor to review in the PR. Strict track: its plan is in `slice.md`, "Plans for PRs 4 to 7", approved with Thor's answers to "Decisions for Thor". Build to it without a separate plan approval if Thor approved the batch rule (decision 10), otherwise wait for his approval of this plan; if the plan turns out wrong, stop and tell the lead. Work on `feat/onboarding`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 6. Write and publish

> Read `CLAUDE.md`, `ARCHITECTURE.md` (data model, "Publish an essay"), `DESIGN.md`, `docs/specs/slice.md`, `docs/specs/mvp.md` §4, and ADRs 0004, 0005, 0011 and 0013. The task is slice PR 6: the `essay` and `essay_version` tables, `/write/:iso` with a bare Markdown editor and the template headings, Save draft and Publish, and the publish pipeline with its XSS tests. Everything `slice.md` cuts stays out. Strict track: its plan is in `slice.md`, "Plans for PRs 4 to 7", approved with Thor's answers to "Decisions for Thor". Build to it without a separate plan approval if Thor approved the batch rule (decision 10), otherwise wait for his approval of this plan; if the plan turns out wrong, stop and tell the lead. Work on `feat/write-publish`, open a draft PR. Send the lead one message when it is ready or you are blocked.

### 7. My map fills in

> Read `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/specs/slice.md`, `docs/specs/mvp.md` §5, ADRs 0003 and 0010, and PR #32's description. The task is slice PR 7: the owner's own `/u/:username` and country page on the shell, through `access.server.ts` (decision 8), the map's written countries from published essays, `/` redirecting a signed-in person, and the slice's end-to-end test. Strict track: its plan is in `slice.md`, "Plans for PRs 4 to 7", approved with Thor's answers to "Decisions for Thor". Build to it without a separate plan approval if Thor approved the batch rule (decision 10), otherwise wait for his approval of this plan; if the plan turns out wrong, stop and tell the lead. Work on `feat/my-map`, open a draft PR. Send the lead one message when it is ready or you are blocked.
