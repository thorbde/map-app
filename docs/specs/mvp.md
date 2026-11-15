# MVP spec

**Goal:** a small, polished version that Thor and a handful of invited people can use to write essays and watch their map fill in. UX quality matters more than feature count. Everything not listed here is in `roadmap.md`.

**Launch mode:** invite-only sign-up, controlled by `SIGNUP_MODE=invite|open` and a list of invite codes. This keeps moderation needs minimal at first.

---

## 1. Country data (`features/countries`)

`countries.ts`: every country in scope, with:
- `iso`: alpha-2
- `name`: common English short name, e.g. "Côte d'Ivoire", "DR Congo", "Eswatini"
- `continent`: `africa` | `europe` | `asia` | `north-america` | `south-america` | `oceania`
- `region`

**Scope:** the 193 UN members plus Palestine (PS) and the Vatican (VA), for 195 in total. Add a commented-out, easy-to-enable option for Kosovo (XK) and Taiwan (TW).

**Regions:**
- **Africa uses the African Union's regions exactly as listed:**
  - **North Africa (6):** DZ, EG, LY, MR, MA, TN
  - **West Africa (15):** BJ, BF, CV, CI, GM, GH, GN, GW, LR, ML, NE, NG, SN, SL, TG
  - **Central Africa (9):** BI, CM, CF, TD, CG, CD, GQ, GA, ST
  - **East Africa (14):** KM, DJ, ER, ET, KE, MG, MU, RW, SC, SO, SS, SD, TZ, UG
  - **Southern Africa (10):** AO, BW, SZ, LS, MW, MZ, NA, ZA, ZM, ZW
- **Other continents:** UN M49 sub-regions. The Americas are split into North America (Central America and the Caribbean included) and South America.

**Facts** (ADR 0012): `facts.ts`, a reviewed static dataset per ISO code: capital, languages, population (with its year), independence date, government type and land neighbours. It's generated from **Wikidata** by `scripts/build-facts.ts`, plus a small overrides file. A **monthly scheduled job** regenerates it and opens a PR with the changes for Thor to review. Writers don't type facts in.

**Tests:** 54 countries in Africa, 195 in total, no duplicates, and every country has a complete fact entry.

## 2. Maps and the app shell (`features/maps`)

**The map is always the base of the app** (ADR 0010). It fills the screen, and every page is a floating panel on top of it. The design is in `docs/design/README.md`.

- **`scripts/build-maps.ts`:**
  - Natural Earth (`world-atlas`) → `d3-geo` → **simplified, quantized** SVG path data per ISO code
  - **Equal Earth** projection: one world map, plus more detailed geometry per continent that loads when zooming in
  - output as hashed static assets, **not in the Worker bundle**
  - budget: **under ~50 KB compressed per map file**
- **The shell:** a layout route renders the map full-screen and keeps it mounted. Child routes render only the panel. The URL decides the view: the world, a continent, or a selected country. Moving between views animates, unless the user prefers reduced motion.
- **`<CountryMap view written selected owner />`:**
  - `view`: the world, a continent, or a country to zoom to
  - **written countries:** filled with the accent colour; **the selected country** uses a clearly different shade of it (no outline)
  - **for visitors:** written countries are focusable links with an `aria-label`; unwritten ones are neutral and not links
  - **for the owner:** every country is a link. No published essay → the editor; published → the essay, with an Edit button
  - colour via CSS classes using tokens
- **Map controls:** zoom in and out buttons, and continent chips (World, Africa, Europe, Asia, North America, South America, Oceania) that switch the view. No legend.
- **Edge cases:**
  - Disputed or non-sovereign areas (Western Sahara, Northern Cyprus, Greenland, French Guiana, Puerto Rico and so on) are neutral and not clickable.
  - Somaliland is merged into Somalia.
  - Unknown features render neutral and never crash.
  - No Antarctica.
- **Small states** that are too small or missing at the scale get a marker dot. This is a generic rule; for Africa that means at least CV, ST, KM, MU and SC. **Test:** every country can be clicked in its continent view.
- **Phones:** the panel becomes a bottom sheet over the map, and can be expanded to read.
- **Keep the component's interface clean,** since the map's look will be redesigned later without changes elsewhere.

## 3. Auth and onboarding (`features/auth`)

- **Better Auth with Google sign-in only** (ADR 0007). Email + password is on the roadmap.
- The invite code is required when `SIGNUP_MODE=invite`.
- **e2e tests** use a test-only sign-in path that exists only when `AUTH_TEST_MODE=1` (ADR 0007).
- **Better Auth's rate limiting** on the auth routes.
- **`/onboarding`** after the first sign-in: pick a username (3–30 chars, `[a-z0-9_-]`, unique, not on the reserved list: admin, api, write, settings, explore, method, u, login, signup…) and a display name.
- **The first admin** is set with a one-off script documented in the README.

## 4. Writing (`features/essays`)

- **There's no separate "Write" page.** The owner starts or continues an essay by clicking a country on the map (§2), or from "In progress" and "Continue writing" in their profile panel.
- **`/write/:iso` is the editor,** in a wide panel with the map still visible beside it (ADR 0011):
  - **CodeMirror 6** with Markdown, styled so text looks formatted as you type, and a **formatting toolbar**: heading, subheading, bold, italic, link, bulleted list, quote, emoji. The toolbar only offers what the publish pipeline allows. **No preview mode.**
  - **A new essay starts with these headings:** Geography and nature, Cities, History, The country today, Culture, A person, Why?, Connections, Three things I didn't know, What I got wrong, Before I started, Sources. Empty sections show their one-line guidance in grey.
  - **A side panel with two tabs:**
    - **Facts:** the country's reference facts (read-only, ADR 0012) and the **memory hook**, which the writer writes.
    - **Template guide:** one line of guidance per section, taken from `docs/METHOD.md`, and a link to `/method`.
  - **A word count**, with a soft target of 400–600.
  - **Autosave**, debounced, with a status of Saving… / Saved / Offline, and an "Unpublished changes" badge when the draft differs from the published version.
- **Publish:** validate, render, store the version (ADR 0005), then show a success state with a link to the published essay.
- **Unpublish** and **Delete essay** both ask for confirmation.

## 5. Reading (`features/profiles`, `features/maps`, `features/essays`)

Every page below is a panel over the map (§2).

- **`/u/:username`:** the world map, and a panel with:
  - name, bio
  - progress in total and per continent ("12 / 195", "4 / 54" for Africa)
  - when it's your own profile: "Continue writing", "In progress" (drafts and unpublished changes), and a hint that clicking a country starts an essay
  - recently published essays
  - a link to `/method`
- **`/u/:username/:continent`:** the map zooms to the continent; the panel shows a region breakdown and progress.
- **`/u/:username/country/:iso`:** the map zooms to the country and selects it; the panel shows:
  - the fact box: the reference facts (ADR 0012) and the writer's memory hook
  - the rendered essay, written/updated dates
  - an **Edit** button when it's your own essay
  - previous/next in publishing order
  - a "Report" link (mailto for the MVP)
- **`/`:**
  - **logged out:** the world map with a panel: what this is, a short "How it works" section linking to `/method`, and sign-in
  - **logged in:** a redirect to your profile
- **`/method`:** renders `docs/METHOD.md`. It's product content that Thor will revise. It mentions features that come later (Test me, review lists, recall questions, riddles). **Don't build those now**, and don't edit the file without asking.
- **All of these go through `access.server.ts`** (ADR 0003).

## 6. Settings (`features/profiles`)

- **Profile:** display name, bio, `current_continent`.
- **Username:** shown, but can't be changed in the MVP. Changing it, with redirects from the old one, is on the roadmap.
- **"Who can see your map":**

  | Value | Label | Helper text |
  |---|---|---|
  | `public` | **Everyone** | Anyone can see your map and published essays, even without an account. |
  | `private` | **Only me** | Your map and essays are hidden. Others can see your name and username, nothing else. |

- **The connected Google account** (shown, for reference).
- **Export:** a zip of all essays as markdown with YAML frontmatter, plus `profile.json`.
- **Delete account:** confirm by typing your username. Hard-deletes everything and signs out everywhere.

## 7. Moderation and admin (minimal)

- An admin can mark a profile or an essay as `hidden` through a simple `/admin` page: search by username, then toggle hidden.
- **`/privacy` and `/terms`** are placeholder pages with a clear TODO for Thor.

## 8. Quality bar

- **Performance:**
  - under 100 KB gzipped JS on reading pages, **including the map shell and its pan and zoom**, and CodeMirror only on `/write/*`
  - `prefetch="intent"` on map countries, prev/next and profile links
  - Smart Placement on
  - no layout shift around the map or the fact box
- **Accessibility:**
  - keyboard navigation through the whole app, including the map
  - visible focus
  - labels everywhere
  - respects `prefers-reduced-motion`
- **Design:**
  - tokens in `@thorbde/tokens` (DTCG + Terrazzo), with light and dark mode (ADR 0008)
  - every screen built from `@thorbde/ui` components
  - Storybook stories for every `ui` component
- **Tests:**
  - unit tests for country data, rendering and sanitization, and username rules
  - the access matrix from ADR 0003
  - **e2e:** sign in (test mode) → onboard → write → publish → view as logged out → set private → verify hidden → export → delete account

## Out of scope for the MVP

Email + password sign-in, username changes, followers, friends visibility, stars, Explore, version-history UI, cities and the locator map, recall questions and riddles, "Test me", the memorization mode (flashcards, quizzes, hiding and revealing facts), review and quiz, translations, the supporter tier and payments, OG images, notifications, the map redesign. See `roadmap.md`.
