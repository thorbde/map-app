# Kickoff

## 1. Before you start (Thor, by hand)

- [x] Create an empty GitHub repo and push this folder to `main`.
- [x] Turn on branch protection for `main` (a ruleset): require a PR, block force pushes and deletions, linear history, squash merges. Approvals are set to 0, because GitHub doesn't let you approve PRs opened from your own account; Thor merging is the approval.
- [ ] Add the required status checks `check` and `e2e` to the ruleset once CI has run them for the first time (M0).
- [ ] Cloudflare **production** account: note the account ID and create an API token with **Workers Scripts: Edit** and **D1: Edit**. Store both as secrets of a GitHub **`production` environment** that only allows `main` (Settings → Environments), not as repository secrets (ADR 0006).
- [ ] Cloudflare **preview** account (a second, free account): the same kind of token. Store as repository secrets `CLOUDFLARE_PREVIEW_ACCOUNT_ID` and `CLOUDFLARE_PREVIEW_API_TOKEN`.
- [ ] Google Cloud console: create an OAuth client (M2). Add the redirect URIs once the dev and prod URLs are known.
- [ ] Optional: pick a domain name.

Claude Code will tell you which secrets go where (`.dev.vars` locally, GitHub Actions secrets, `wrangler secret`).

No Neon, Resend or Turnstile accounts are needed for the MVP (ADRs 0006 and 0007).

## 2. Milestones

Each milestone is several small PRs, and each PR starts with a plan you approve.

Maps come before auth: they need no database or login, they're the heart of the product, and they carry the most UX risk.

| # | Milestone | Done when |
|---|---|---|
| **M0** | **Foundation:** a pnpm workspace (`apps/web`, `packages/tokens`, `packages/ui`), React Router v7 on Workers, TS strict, Biome, dependency-cruiser rules from `ARCHITECTURE.md`, knip, Vitest (Workers pool), Playwright, CI (`pnpm check` + e2e), preview deploys per PR, `@thorbde/tokens` (DTCG + Terrazzo, light and dark), `@thorbde/ui` with Storybook and a first set of Base UI components (Button, Field, Link, Dialog), a README with setup | A "hello" page built from `@thorbde/ui` deploys to a preview URL, CI is green, a boundary violation fails a test in CI |
| **M1** | **Countries and maps:** `countries.ts` + tests, the Wikidata facts dataset with its monthly refresh PR (ADR 0012), `build-maps.ts`, the map-first shell (ADR 0010) with `<CountryMap>`, pan and zoom, URL-driven views, continent chips, small-state markers, keyboard navigation | Every country can be clicked in its continent view, the shell keeps the map mounted between pages, and the size budgets hold |
| **M2** | **Data and auth:** Drizzle schema + migrations on D1, preview databases per PR, Better Auth with Google, the test-only sign-in for e2e, invite codes, onboarding/username | You can sign in with Google with an invite code and pick a username, on a preview deploy |
| **M3** | **Writing:** click-a-country to write, the CodeMirror editor with its formatting toolbar (ADR 0011), the template and guide, the memory hook, autosave, the publish pipeline (render + sanitize + version), unpublish/delete | You can write and publish an essay, and the XSS tests pass |
| **M4** | **Reading and privacy:** the profile, continent and essay panels, `access.server.ts` + the full test matrix, settings (profile, visibility), export, delete account | The e2e flow from the MVP spec passes, including the private/logged-out checks |
| **M5** | **Launch prep:** minimal admin, privacy and terms placeholders, Lighthouse CI budgets, accessibility pass, production deploy | Live on production with invite-only sign-up |

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

- Look at the dependency graph (dependency-cruiser can output an SVG in CI) for anything unexpected.
- Read the knip report for dead code and unused dependencies.
- Read the ADRs added this week. Do you still agree with them?
- Check that `ARCHITECTURE.md` still matches reality.
