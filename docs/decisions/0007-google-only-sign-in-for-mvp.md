# 0007: Google sign-in only for the MVP

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the email/password, Resend and Turnstile parts of ADR 0001 and `docs/specs/mvp.md` §3

## Context
The MVP is invite-only, for a handful of people. Email and password sign-in brings a lot with it: a sign-up form, email verification, password reset, an email provider (Resend) with a verified domain, a bot check (Turnstile), and password hashing that can blow the Workers free plan's ~10 ms CPU limit per request.

## Decision
- **Better Auth with Google as the only sign-in method** for the MVP.
- **No Resend and no Turnstile** in the MVP. Invite codes plus Google's own account checks keep sign-up closed.
- **Rate limiting** from Better Auth stays on the auth routes.
- **Tests:** e2e tests can't sign in to a real Google account, so there is a **test-only sign-in path**. A sign-in that skips Google is an auth bypass, so it is fenced in on every side:
  - **e2e runs only against a Worker started on the machine running the tests**: locally, or inside the CI job on `localhost`. **Never against a deployed preview or production URL.** Previews are for Thor to click through, signed in with Google.
  - The path exists only when `AUTH_TEST_MODE=1`. That flag is **never** a var, secret or binding in any deployed wrangler environment, and a CI check fails the build if it appears in the deployed configuration.
  - Even with the flag set, the path answers only requests to `localhost` or `127.0.0.1`.
  - A test proves the path returns 404 when the flag is unset.
  The exact design is part of the auth milestone's plan.

## Alternatives considered
- **Email + password + Google (the original spec):** about a third more auth work, two more vendors, and the CPU problem, for users who are invited friends.
- **Magic links (email only):** still needs Resend and a domain.

## Consequences
- Everyone needs a Google account. Some privacy-minded people won't want that. That's acceptable for an invite-only MVP.
- **Email + password moves to the roadmap,** before open sign-up. Better Auth adds it as a normal feature PR, and Resend and Turnstile return with it.
- The account data we hold is smaller: name, email and avatar URL from Google, no password hashes.
