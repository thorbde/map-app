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

**Tests:** 54 countries in Africa, 195 in total, no duplicates.

## 2. Maps (`features/maps`)

- **`scripts/build-maps.ts`:**
  - Natural Earth (`world-atlas`) → `d3-geo` → **simplified, quantized** SVG path data per ISO code
  - one world map (Equal Earth) and one per continent (fitted projection)
  - output as hashed static assets, **not in the Worker bundle**
  - budget: **under ~50 KB compressed per map**
- **`<CountryMap continent? written={Set<iso>} owner={username} />`**
  - written countries: highlighted, focusable links with an `aria-label`
  - unwritten: neutral, not links
  - colour via CSS classes using tokens
- **Edge cases:**
  - Disputed or non-sovereign areas (Western Sahara, Northern Cyprus, Greenland, French Guiana, Puerto Rico and so on) are neutral and not clickable.
  - Somaliland is merged into Somalia.
  - Unknown features render neutral and never crash.
  - No Antarctica.
- **Small states** that are too small or missing at the scale get a marker dot. This is a generic rule; for Africa that means at least CV, ST, KM, MU and SC. **Test:** every country can be clicked in its continent view.
- **The visual design is intentionally simple in the MVP.** Keep the component's interface clean, since the map will be redesigned later without changes elsewhere.

## 3. Auth and onboarding (`features/auth`)

- **Better Auth:** email + password, with email verification and password reset via Resend, plus Google sign-in.
- **Turnstile** on sign-up. The invite code is required when `SIGNUP_MODE=invite`.
- **Better Auth's rate limiting** on the auth routes.
- **`/onboarding`** after the first sign-in: pick a username (3–30 chars, `[a-z0-9_-]`, unique, not on the reserved list: admin, api, write, settings, explore, method, u, login, signup…) and a display name.
- **The first admin** is set with a one-off script documented in the README.

## 4. Writing (`features/essays`)

- **`/write`:** your essays, grouped as Drafts / Published / Unpublished changes, plus "Start a new country".
- **The country picker** shows countries without an essay, grouped by continent and region, with `current_continent` first.
- **`/write/:iso` is the editor:**
  - **CodeMirror 6** with markdown, and Edit / Preview / Split views. The preview uses the publish pipeline (ADR 0004).
  - **A new essay starts with these headings:** Geography and nature, Cities, History, The country today, Culture, A person, Why?, Connections, Three things I didn't know, What I got wrong, Before I started, Sources.
  - **A collapsible "Template guide" panel** with one line of guidance per section, taken from `docs/METHOD.md`.
  - **A facts form:** hook, capital, languages, population, independence, government, neighbours (multi-select of countries).
  - **A word count**, with a soft target of 400–600.
  - **Autosave**, debounced, with a status of Saving… / Saved / Offline.
- **Publish:** validate, render, store the version (ADR 0005), then show a success state with a link to the published essay.
- **Unpublish** and **Delete essay** both ask for confirmation.

## 5. Reading (`features/profiles`, `features/maps`, `features/essays`)

- **`/u/:username`:**
  - name, bio, the world map
  - progress per continent and in total ("12 / 54 countries in Africa · 12 / 195")
  - "Continue writing" when it's your own profile
- **`/u/:username/:continent`:** the continent map, a region breakdown, and progress.
- **`/u/:username/country/:iso`:**
  - the fact box, the rendered essay, written/updated dates
  - previous/next in publishing order
  - a "Report" link (mailto for the MVP)
- **`/`:**
  - **logged out:** what this is, a short "How it works" section linking to `/method`, and sign-in / sign-up
  - **logged in:** a redirect to your profile
- **`/method`:** renders `docs/METHOD.md`. It's product content that Thor will revise. It mentions features that come later (Test me, review lists, recall questions, riddles). **Don't build those now**, and don't edit the file without asking.
- **All of these go through `access.server.ts`** (ADR 0003).

## 6. Settings (`features/profiles`)

- **Profile:** display name, bio, `current_continent`.
- **Username:** can change once every 30 days, and the old username redirects for 30 days.
- **"Who can see your map":**

  | Value | Label | Helper text |
  |---|---|---|
  | `public` | **Everyone** | Anyone can see your map and published essays, even without an account. |
  | `private` | **Only me** | Your map and essays are hidden. Others can see your name and username, nothing else. |

- **Password** and the connected Google account.
- **Export:** a zip of all essays as markdown with YAML frontmatter, plus `profile.json`.
- **Delete account:** confirm by typing your username. Hard-deletes everything and signs out everywhere.

## 7. Moderation and admin (minimal)

- An admin can mark a profile or an essay as `hidden` through a simple `/admin` page: search by username, then toggle hidden.
- **`/privacy` and `/terms`** are placeholder pages with a clear TODO for Thor.

## 8. Quality bar

- **Performance:**
  - under 100 KB gzipped JS on reading pages, and CodeMirror only on `/write/*`
  - `prefetch="intent"` on map countries, prev/next and profile links
  - Smart Placement on
  - no layout shift around the map or the fact box
- **Accessibility:**
  - keyboard navigation through the whole app, including the map
  - visible focus
  - labels everywhere
  - respects `prefers-reduced-motion`
- **Design:**
  - tokens in `app/ui/tokens.css`, with light and dark mode
  - every screen built from `app/ui` components
  - Storybook stories for every `ui` component
- **Tests:**
  - unit tests for country data, rendering and sanitization, and username rules
  - the access matrix from ADR 0003
  - **e2e:** sign up → onboard → write → publish → view as logged out → set private → verify hidden → export → delete account

## Out of scope for the MVP

Followers, friends visibility, stars, Explore, version-history UI, cities and the locator map, recall questions and riddles, "Test me", review and quiz, translations, the supporter tier and payments, OG images, notifications, the map redesign. See `roadmap.md`.
