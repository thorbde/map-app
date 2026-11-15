# 0002: Feature modules with enforced boundaries

- **Status:** accepted. The design system moved from `app/ui/` to its own packages in ADR 0008.
- **Date:** 2026-11-15

## Context
Agents write most of the code. Without enforced structure, the codebase drifts: SQL ends up in routes, features reach into each other's internals, and UI gets rebuilt ad hoc. Thor needs to understand the codebase at a glance and keep it scalable.

## Decision
- **Organise by feature** under `app/features/*`. Each feature exposes a public API through `index.ts` (client-safe) and `index.server.ts` (server).
- **Keep routes thin**, and put business logic in feature services.
- **`app/ui/` is the design system, owned by Thor.** Features compose from it. Changes to `app/ui/` need Thor's approval.
- **Boundaries are enforced in CI** with dependency-cruiser (see the table in `ARCHITECTURE.md`). A boundary violation fails the build.
- **knip** in CI catches unused files, exports and dependencies.

## Consequences
- **A little more ceremony** when one feature needs another, since it has to go through a public API. That's intended.
- **Easier review:** a PR's diff maps cleanly to features.
- **New cross-cutting concerns** (e.g. notifications) become their own feature or go in `lib/`, decided in an ADR.
