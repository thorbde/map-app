# 0014: Design tokens: two tiers, semantic names, placeholder values

- **Status:** accepted
- **Date:** 2026-11-15
- **Builds on:** ADR 0008 (the design system as packages)

## Context
Components and the app need tokens to build on now, but the colour palette and the fonts aren't decided: the first palettes didn't work, and the direction is captured in `docs/design/brief.md`. Waiting would block the components; picking something quickly would bake in a look nobody chose.

## Decision
- **Two tiers in DTCG JSON** (`packages/tokens/tokens/`):
  - **Primitives** (`primitives.json`): raw values. A neutral grey scale, font families, the type scale, space, radius, shadow and motion.
  - **Semantic** (`semantic.json`): what things are for: `color.bg.page`, `color.bg.surface`, `color.bg.subtle`, `color.text.default|muted|on-accent`, `color.border.default`, `color.accent.default|hover`, `color.focus`, `color.map.ocean|land|border|written|selected`, `font.ui`, `font.essay`.
- **Components and the app use semantic tokens only.** Primitives exist to feed the semantic tier. Component tokens are added only when a component needs a decision of its own.
- **Naming:** dot paths in DTCG, dashes in CSS: `color.text.muted` becomes `--color-text-muted`.
- **The values are placeholders on purpose:** a greyscale palette whose accent is near-black, and system fonts. Every pair that must pass contrast does (text 4.5:1, map shapes 3:1). Choosing the real palette and fonts changes values in these two files, not names, so nothing that uses the tokens has to change.
- **Light theme only for now.** Dark mode will be a second mode of the same semantic tokens.
- **Terrazzo builds the CSS** (`generated/tokens.css`, custom properties on `:root`). The output is **committed**, so the app and Storybook need no build step, and `pnpm tokens:check` (part of `pnpm check`) fails when it's out of step with the JSON.
- **No TypeScript output yet.** Terrazzo's JS plugin is meant for server-side use and is heavy, and nothing needs typed tokens yet. The Tokens story reads the JSON directly.
- **The app loads the CSS** through a side-effect import in `root.tsx`, so Vite bundles and hashes it.

## Alternatives considered
- **Wait for the palette before writing any tokens:** blocks the components for no gain, since the names don't depend on the values.
- **Pick a "safe" palette now:** it would quietly become the design. A visibly unfinished greyscale doesn't.
- **Three tiers (primitive, semantic, component) from the start:** more ceremony than one app and a handful of components need. Component tokens are added when needed.
- **Generate the CSS at build time instead of committing it:** every consumer (dev, build, Storybook, tests) would need a pre-build step.

## Consequences
- **The app looks unfinished until the palette and fonts land,** and that's intended.
- **Changing the palette later** is an edit to `primitives.json` (and `semantic.json` if roles shift), followed by `pnpm tokens`.
- **Contrast must be re-checked** whenever values change. The colour playground and the Tokens story help, and the brief lists the rules.
