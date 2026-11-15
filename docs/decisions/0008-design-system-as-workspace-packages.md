# 0008: The design system lives in its own packages: tokens, Base UI, CSS Modules

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the `app/ui/` parts of ADR 0002, and "Radix primitives" in ADR 0001

## Context
Thor is a design systems engineer and owns the design system. It should be reusable in future applications, so it must not depend on this app in any way. A plain `tokens.css` file is also harder to work with than a proper token pipeline.

## Decision
- **The repo is a pnpm workspace** with these packages:

  ```
  apps/web/          the map app (React Router on Workers)
  packages/tokens/   @thorbde/tokens: design tokens
  packages/ui/       @thorbde/ui: components, plus Storybook
  ```

- **`@thorbde/tokens`:**
  - Tokens are written as **DTCG JSON** (the W3C Design Tokens format, stable since October 2025).
  - **Terrazzo** builds them into CSS custom properties (with light and dark modes) and TypeScript types.
- **`@thorbde/ui`:**
  - Components are built on **Base UI** (`@base-ui/react`), a headless, accessible component library.
  - They're styled with **CSS Modules** that only use token custom properties.
  - Storybook lives in this package, with a story for every component.
- **One-way dependencies:** `apps/*` may import the packages, and the packages may never import from `apps/*`. `ui` may import `tokens`, never the other way round. dependency-cruiser enforces this in CI.
- **Product-specific components stay in the app** (the map, the editor, the fact box). Only generic, reusable components go into `@thorbde/ui`.
- **No build or publish step yet.** The app consumes the packages' source directly through the workspace. When a second app needs them, we add a build, publish to a registry, or move the packages to their own repo, in a new ADR.
- **Thor approves every change to `packages/`.**

## Alternatives considered
- **Radix primitives (ADR 0001):** still widely used, but Thor prefers Base UI. Base UI reached 1.0 in December 2025, maintained by MUI with contributors from Radix and Floating UI.
- **Style Dictionary** instead of Terrazzo: more flexible, more configuration. Terrazzo is DTCG-native and needs less setup. Moving later is mostly a configuration change, since both read DTCG.
- **Tailwind, vanilla-extract or another CSS-in-JS library:** each adds a dependency or a runtime. CSS Modules are built into Vite and cost nothing at runtime, which helps the 100 KB JavaScript budget.
- **A separate repo for the design system now:** two repos, versioning and publishing before there's a second consumer. Deferred.

## Consequences
- The app's paths move under `apps/web/`.
- Tooling must be workspace-aware: TypeScript project references, Biome, knip, dependency-cruiser and Vitest all need configuring per package.
- **Bundle budget:** Base UI is tree-shaken per component, but every interactive component used on a reading page counts towards the 100 KB budget.
- The package sizes and exact dependencies are recorded in the M0 toolchain ADR.
