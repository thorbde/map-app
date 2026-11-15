# 0015: Components are tested through their stories

- **Status:** accepted
- **Date:** 2026-11-15
- **Builds on:** ADR 0008 (the design system as packages), ADR 0013 (toolchain)

## Context
`@thorbde/ui` needs tests, above all accessibility checks: Thor wants accessibility treated as non-negotiable. Every component already has Storybook stories that show its states. Writing a second set of test files that render the same states would double the work, and the two would drift.

## Decision
- **Every story is a test.** Storybook's Vitest add-on (`@storybook/addon-vitest`) turns each story into a Vitest test that renders it in a real browser (Chromium, through Playwright).
- **Accessibility violations fail the test.** The a11y add-on runs axe on every story, and `.storybook/preview.ts` sets `a11y.test: "error"`. A new component is checked automatically just by having stories.
- **Interactions** go in a story's `play` function when a component needs them (keyboard use, focus), so they're tested the same way.
- **Playgrounds are not tests.** They're design tools that deliberately show failing contrast pairs and load fonts from Google, so they carry the `!test` tag.
- **It runs in `pnpm test`,** so it's part of `pnpm check` and CI. CI installs Chromium for it; locally, `PLAYWRIGHT_CHROMIUM_PATH` can point at one you already have, as for the e2e tests.

## Alternatives considered
- **Playwright with `@axe-core/playwright` against the built Storybook:** fewer packages in `@thorbde/ui`, but every story has to be listed by hand, and it needs a Storybook build before the tests can run.
- **Vitest with jsdom and Testing Library:** no real browser, so no real layout, focus or colour, and axe can't check contrast in jsdom.
- **Only the a11y panel in the Storybook UI:** nothing fails, so violations slip through.

## Consequences
- **A component without stories isn't tested,** so every component ships with stories covering its states (variants, disabled, and so on).
- **`pnpm test` needs a Chromium**, like `pnpm test:e2e` already does.
- **Proven:** a story with an unlabelled button failed with axe's `button-name` rule, and passed again once removed.
