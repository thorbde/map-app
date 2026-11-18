# 0009: Automated Claude PR review in GitHub Actions

- **Status:** accepted
- **Date:** 2026-11-15

## Context
Agents write the code and Thor reviews it. KICKOFF.md asked for a second agent with fresh context to review every PR, but running that by hand in a separate session is easy to forget. Anthropic's managed Code Review product is only available on Team and Enterprise plans. Thor has a personal subscription.

## Decision
- **`.github/workflows/claude-review.yml`** runs `anthropics/claude-code-action@v1`, authenticated with Thor's subscription through the `CLAUDE_CODE_OAUTH_TOKEN` secret (created with `claude setup-token`). No API key.
- **It runs only when:**
  - a PR is marked **Ready for review**. Agents open PRs as drafts and mark them ready when the definition of done is met.
  - **Thor comments `@claude`** on a PR. The comment's text is passed on as extra focus.
- **Fast and cheap:** a single agent, Sonnet, medium effort, at most 30 turns, a 15-minute timeout, and one run per PR at a time.
- **What it checks:** security and privacy first (ADRs 0003, 0004, 0007), then correctness, then CLAUDE.md's hard rules and the ADRs, then missing tests and docs. No style nits.
- **Output:** inline comments on the lines concerned, plus one summary comment with a verdict.
- **It's advice, not a gate.** It is not a required status check, and Thor still merges.
  - **Amended by Thor, 2026-11-18:** Thor merges strict-track PRs (accounts, privacy, access control, database and migrations, `packages/`). On other PRs the lead session may merge once CI is green and this review has no open findings (`CLAUDE.md`, "Working faster").

## Alternatives considered
- **Code Review (managed):** Team and Enterprise plans only.
- **The official `code-review` plugin:** runs four or more agents plus one scorer per finding, so it's slower and uses more of the subscription. It also skips PRs it has already reviewed, which breaks re-reviewing on request.
- **Reviewing on every push:** uses far more of the subscription for little gain while a PR is still a draft.
- **A manual review in a separate Claude Code session:** still possible at any time, but easy to forget.

## Consequences
- **Reviews use Thor's subscription limits.** If limits become a problem, lower the effort, lower the turn cap, or move to a Console API key.
- **The token is tied to Thor's account** and expires. When reviews fail with an authentication error, generate a new token with `claude setup-token` and update the secret.
- **Security on a public repo:** only Thor's comments trigger a review (also, the action itself rejects users without write access and bots), and PRs from forks are skipped because they can't read secrets.
- **The `@claude` trigger only works once this workflow is on `main`,** because GitHub runs comment-triggered workflows from the default branch.
