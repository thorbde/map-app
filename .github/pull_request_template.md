## What and why

<!-- One or two sentences. Link the spec section, milestone and ADRs this PR implements. -->

## How it works

<!-- Plain language, for Thor. Which files do what, and how the pieces fit the architecture. -->

## Changes

<!-- The main files, grouped by feature or package. -->

## Risks

<!-- What could break, privacy and access-control impact, performance and bundle-size impact, and anything you were unsure about. Write "None" only if that's honestly true. -->

## How it was tested

<!-- Commands run, tests added, and what you checked by hand. -->

## Screenshots

<!-- Required for UI changes: light and dark mode, and a narrow (mobile) width. Delete this section otherwise. -->

## Checklist

- [ ] `pnpm check` is green
- [ ] The e2e tests touching this feature pass
- [ ] Docs updated in this PR (`ARCHITECTURE.md`, specs, README) where anything changed
- [ ] An ADR for every new dependency, pattern or decision
- [ ] Reading another user's data goes through `access.server.ts`
- [ ] No changes to `packages/` without Thor's approval
- [ ] UI changes checked against `DESIGN.md`, row by row in its "Never" table (or: no UI changes)
- [ ] No migration that has already been merged was edited
