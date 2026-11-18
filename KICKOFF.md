# Kickoff

## 1. Before you start (Thor, by hand)

- [x] Create an empty GitHub repo and push this folder to `main`.
- [x] Turn on branch protection for `main` (a ruleset): require a PR, block force pushes and deletions, linear history, squash merges. Approvals are set to 0, because GitHub doesn't let you approve PRs opened from your own account; Thor merging is the approval.
- [ ] Add the required status checks to the ruleset once CI has run them for the first time: `check` after M0 PR 2, `e2e` after M0 PR 3.
- [x] Cloudflare **Previews** account (a second, free account under the same login, shared by all apps' previews): a token from the "Edit Cloudflare Workers" template plus **D1: Edit**, limited to that account. Stored as repository secrets `CLOUDFLARE_PREVIEW_ACCOUNT_ID` and `CLOUDFLARE_PREVIEW_API_TOKEN`.
- [ ] Cloudflare **production** account (your existing one), before M5: the same kind of token, stored as secrets of a GitHub **`production` environment** that only allows `main` (Settings → Environments), not as repository secrets (ADR 0006).
- [ ] Google Cloud console: create an OAuth client (M2). Add the redirect URIs once the dev and prod URLs are known.
- [ ] Optional: pick a domain name.

Claude Code will tell you which secrets go where (`.dev.vars` locally, GitHub Actions secrets, `wrangler secret`).

No Neon, Resend or Turnstile accounts are needed for the MVP (ADRs 0006 and 0007).

## 2. Milestones

Each milestone is several small PRs, and each PR starts with a plan you approve.

Maps come before auth: they need no database or login, they're the heart of the product, and they carry the most UX risk.

**M0 is done.** The plan for M1, its open questions, and a kickoff prompt for a new session are in `docs/specs/m1.md`.

The plan for M2, with its questions for Thor and what he must create by hand, is in `docs/specs/m2.md`.

| # | Milestone | Done when |
|---|---|---|
| **M0** | **Foundation:** a pnpm workspace (`apps/web`, `packages/tokens`, `packages/ui`), React Router v8 on Workers, TS strict, Biome, dependency-cruiser rules from `ARCHITECTURE.md`, knip, Vitest (in workerd), Playwright, CI (`pnpm check` + e2e), preview deploys per PR, `@thorbde/tokens` (DTCG + Terrazzo, light and dark), `@thorbde/ui` with Storybook and a first set of Base UI components (Button, Field, Link, Dialog), a README with setup | A "hello" page built from `@thorbde/ui` deploys to a preview URL, CI is green, a boundary violation fails a test in CI |
| **M1** | **Countries and maps:** `countries.ts` + tests, the Wikidata facts dataset with its monthly refresh PR (ADR 0012), `build-maps.ts`, the map-first shell (ADR 0010) with `<CountryMap>`, pan and zoom, URL-driven views, continent chips, small-state markers, keyboard navigation | Every country can be clicked in its continent view, the shell keeps the map mounted between pages, and the size budgets hold |
| **M2** | **Data and auth:** Drizzle schema + migrations on D1, preview databases per PR, Better Auth with Google, the test-only sign-in for e2e, invite codes, onboarding/username | You can sign in with Google with an invite code and pick a username, on a preview deploy |
| **M3** | **Writing:** click-a-country to write, the CodeMirror editor with its formatting toolbar (ADR 0011), the template and guide, the memory hook, autosave, the publish pipeline (render + sanitize + version), unpublish/delete | You can write and publish an essay, and the XSS tests pass |
| **M4** | **Reading and privacy:** the profile, continent and essay panels, `access.server.ts` + the full test matrix, settings (profile, visibility), export, delete account | The e2e flow from the MVP spec passes, including the private/logged-out checks |
| **M5** | **Launch prep:** minimal admin, privacy and terms placeholders, Lighthouse CI budgets, accessibility pass, production deploy | Live on production with invite-only sign-up |

### M0, PR by PR

| PR | What it adds | What CI checks afterwards |
|---|---|---|
| 1. Scaffold | pnpm workspace, React Router on Workers, TypeScript, Biome, README, ADR 0013 | Nothing yet (`pnpm check` runs locally) |
| 2. CI | `ci.yml` and `preview.yml`: a preview deploy per PR in the Previews account | `check`: lint, typecheck, build, and the **150 KB JavaScript budget** per page. **Then make `check` a required status check.** |
| 3. Tests | Vitest (Cloudflare's Vitest plugin, in workerd) and Playwright | Unit and integration tests inside `check`, plus a separate `e2e` job against the production build. **Then make `e2e` required too** (source: GitHub Actions). |
| 4. Boundaries | dependency-cruiser and knip | Import rules and unused code inside `check`; a dependency graph for the weekly check |
| 5. Storybook and playgrounds | `@thorbde/ui` with Storybook, and playgrounds for comparing fonts, colour palettes (with WCAG contrast and the map) and type scales. Storybook deploys per PR and for `main` | Storybook builds inside `check` |
| 6. Tokens | `@thorbde/tokens`: DTCG + Terrazzo, primitive and semantic tiers, light first, the **teal palette**, and **placeholder fonts** until they're chosen (ADR 0014, `docs/design/brief.md`). A Tokens overview in Storybook | Generated CSS is checked against the JSON inside `check` |
| 7. UI foundation | CSS Modules on tokens, Button | Accessibility checks on the components |
| 8. Components | Field, Link, Dialog | Accessibility checks on the components |

Lighthouse CI (load speed and accessibility on a mid-range phone) comes in M5.

## 3. The first prompt for Claude Code

Paste this:

```
Read CLAUDE.md, ARCHITECTURE.md, every ADR in docs/decisions/, and docs/specs/mvp.md.
Skim docs/METHOD.md for product context.

Then:
1. Summarise back to me, in a few bullets, what we're building and the rules you'll follow.
   Flag anything in the docs that is unclear, contradictory, or that you'd push back on.
2. Propose a PR-by-PR plan for milestone M0 (Foundation) from KICKOFF.md.
   For each PR: the scope, the key files, and how we'll verify it.
3. List anything you need from me (accounts, secrets, decisions) before starting.

Do not write any code until I approve the plan.
```

## 4. The review loop for every PR

1. The agent proposes a plan, and you approve or adjust it.
2. The agent implements it and opens a **draft** PR using the template.
3. When the PR is done, it's marked **Ready for review**, and the automated Claude review runs (ADR 0009): inline comments plus a summary with a verdict. Comment `@claude` on the PR to run it again, optionally with what to focus on. For a deeper review, you can still run a separate Claude Code session: *"Review PR #N against CLAUDE.md and the ADRs. Be critical."*
4. You read the PR's "How it works" section, check the screenshots, and click through the preview deploy.
5. Ask the agent: *"Walk me through how this fits the architecture."*
6. Merge.

## 5. Weekly check (15 minutes)

- Look at the dependency graph for anything unexpected: it's in the summary of the latest CI run on `main` (Actions → CI → the run → Summary), or run `pnpm graph`.
- knip fails CI on dead code and unused dependencies, so there's no report to read; skim `knip.json` for anything ignored that shouldn't be.
- Read the ADRs added this week. Do you still agree with them?
- Check that `ARCHITECTURE.md` still matches reality.
