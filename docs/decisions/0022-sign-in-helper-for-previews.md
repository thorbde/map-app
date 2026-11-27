# 0022: One fixed sign-in helper for PR previews

- **Status:** accepted
- **Date:** 2026-11-27
- **Decided by:** Thor, 2026-11-18 (m2.md, question 1, option A). Built in M2 PR 3.
- **Updates:** ADR 0006 (what lives in the Previews account), ADR 0007

## Context
Google sends a person back after sign-in only to addresses registered with it in advance, exactly. Each PR's preview has its own address (`map-app-pr-<n>.previews-d21.workers.dev`), so none of them can be registered ahead of time.

## What already exists
- **Better Auth's [OAuth Proxy plugin](https://better-auth.com/docs/plugins/oauth-proxy)** solves exactly this: one server at a fixed address takes Google's answer, encrypts the profile with a shared secret, and hands it to the preview that started the sign-in. The preview creates the person and the session in its own database; the fixed server writes no account.
- **Elsewhere:** Auth.js solves it the same way (`AUTH_REDIRECT_PROXY_URL`, in its guide to securing preview deployments): one stable deploy takes the provider's answer and redirects to the preview.

Nothing of ours is built for it: our part is the settings and the deploy.

## Decision
- **The helper is `memogra-main`**, a copy of `main` in the Previews account at `https://memogra-main.previews-d21.workers.dev`. `.github/workflows/auth-helper.yml` deploys it on every push to `main`, and by hand (`workflow_dispatch`).
- **Google's preview client has two redirect addresses:** the helper's, `https://memogra-main.previews-d21.workers.dev/api/auth/callback/google`, and `http://localhost:5173/api/auth/callback/google` for `pnpm dev`, where Google answers directly.
- **The settings decide the role**, checked with zod in `server/platform/index.server.ts`:
  - a **preview** has `AUTH_PROXY_URL` (the helper's address), and so proxies its sign-ins;
  - the **helper** has `AUTH_TRUSTED_ORIGINS` (`https://map-app-pr-*.previews-d21.workers.dev`), the only addresses it hands a sign-in to;
  - **locally** neither is set, and Google answers directly.
- **One secret, `PREVIEW_AUTH_SECRET`,** is both Better Auth's secret and the proxy's shared secret on previews and the helper. Better Auth derives a separate key for each use. Production gets its own secret in M5 and never this one.
- **The helper has a database of its own,** `memogra-main` in the EU, made by the same script as the previews' (ADR 0006). The proxied sign-in writes nothing there, but Better Auth's rate limiter counts every request in it.
- **Both settings set by the deploy are checked against the address wrangler reports:** a preview at an unexpected address fails its deploy, instead of sending people to the wrong place.

## Alternatives considered
- **B, Google sign-in only on a fixed copy of `main`:** the fallback, if the proxy stops working. The helper is that copy, so falling back needs no new Worker: previews simply lose Google sign-in.
- **C, registering each PR's address by hand:** a chore for every PR, and Google takes minutes to apply a change.

## Consequences
- **Whoever holds `PREVIEW_AUTH_SECRET` can sign in as anyone on previews and on the helper.** Better Auth's docs say to keep it from code you don't trust. Previews are built only from this repository's own branches (forks get no secrets), the same trust as the preview Cloudflare token.
- **The helper and every preview must run the same Better Auth version.** A PR that upgrades it has no Google sign-in on its preview until it is merged and the helper is redeployed.
- **The helper runs `main`'s code, not the PR's.** A PR that changes how sign-in works can only be tried with Google once merged. The test-only sign-in (M2 PR 4) covers the rest.
- **CPU:** the slow tail of requests is over the free plan's 10 ms (P99 45 ms on the first preview). Previews stay on the free plan; the measurements and the decision are in ADR 0013.
- **Google's consent screen stays in "Testing"** with Thor as the only test user until invite codes arrive (M2 PR 5), so nobody else can sign in at all.
- **When previews are renamed** (`map-app-pr-` to `memogra-pr-`), `PREVIEW_ORIGINS` in `auth-helper.yml` changes with them, or the helper refuses to hand sign-ins over.
