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
- **Tests:** e2e tests can't sign in to a real Google account. A **test-only sign-in path** is enabled only when `AUTH_TEST_MODE=1`, which is set in local and CI test runs and **never** in preview or production. Its design (and a test that proves it's off in production builds) is part of the auth milestone's plan.

## Alternatives considered
- **Email + password + Google (the original spec):** about a third more auth work, two more vendors, and the CPU problem, for users who are invited friends.
- **Magic links (email only):** still needs Resend and a domain.

## Consequences
- Everyone needs a Google account. Some privacy-minded people won't want that. That's acceptable for an invite-only MVP.
- **Email + password moves to the roadmap,** before open sign-up. Better Auth adds it as a normal feature PR, and Resend and Turnstile return with it.
- The account data we hold is smaller: name, email and avatar URL from Google, no password hashes.
