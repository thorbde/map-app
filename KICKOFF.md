# Kickoff

## 1. Before you start (Thor, by hand)

- [ ] Create an empty GitHub repo and push this folder to `main`.
- [ ] Turn on branch protection for `main`: require a PR, require CI to pass, require your approval.
- [ ] Cloudflare account: note the account ID and create an API token for Workers deploys.
- [ ] Neon account: create a project in **eu-central-1 (Frankfurt)**, and create a `dev` branch for local development.
- [ ] Resend account: verify a sending domain (or use the test sender for local development).
- [ ] Google Cloud console: create an OAuth client. Add the redirect URIs once the dev and prod URLs are known.
- [ ] Turnstile: create a site (the test keys work for local development).
- [ ] Optional: pick a domain name.

Claude Code will tell you which secrets go where (`.dev.vars` locally, GitHub Actions secrets, `wrangler secret`).

## 2. Milestones

Each milestone is several small PRs, and each PR starts with a plan you approve.

| # | Milestone | Done when |
|---|---|---|
| **M0** | **Foundation:** React Router v7 on Workers, TS strict, Biome, dependency-cruiser rules from `ARCHITECTURE.md`, knip, Vitest (Workers pool), Playwright, Storybook, CI (`pnpm check` + e2e), preview deploys per PR, `app/ui/tokens.css` with a first set of components (Button, Field, Link, Dialog), a README with setup | A "hello" page deploys to a preview URL, CI is green, a deliberate boundary violation fails CI |
| **M1** | **Data and auth:** Drizzle schema + migrations, Neon client, Better Auth (email/password + verification + reset, Google), Turnstile, invite codes, onboarding/username | You can sign up, verify, sign in with Google and pick a username, on a preview deploy |
| **M2** | **Countries and maps:** `countries.ts` + tests, `build-maps.ts`, `<CountryMap>` for the world and continents, small-state markers, keyboard navigation | Every country can be clicked in its continent view, and the size budgets hold |
| **M3** | **Writing:** `/write`, the country picker, the CodeMirror editor with the template and guide, the facts form, autosave, the publish pipeline (render + sanitize + version), unpublish/delete | You can write and publish an essay, and the XSS tests pass |
| **M4** | **Reading and privacy:** profile, continent and essay pages, `access.server.ts` + the full test matrix, settings (profile, username, visibility), export, delete account | The e2e flow from the MVP spec passes, including the private/logged-out checks |
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
