# 0014: Design tokens: two tiers, semantic names, teal palette

- **Status:** accepted
- **Date:** 2026-11-15
- **Builds on:** ADR 0008 (the design system as packages)

## Context
Components and the app need tokens to build on now. The colour palette was chosen on the design canvas (teal, `docs/design/brief.md`), but the fonts aren't decided. Waiting would block the components; picking a font quickly would bake in a look nobody chose.

## Decision
- **Two tiers in DTCG JSON** (`packages/tokens/tokens/`):
  - **Primitives** (`primitives.json`): raw values. Teal, a teal-tinted grey, sky (the ocean), a neutral grey scale, font families, the type scale, space, radius, shadow and motion.
  - **Semantic** (`semantic.json`): what things are for: `color.bg.page|surface|subtle|subtle-hover|inverse|backdrop`, `color.text.default|muted|link|link-hover|error|on-accent|on-inverse|on-inverse-muted`, `color.border.default|control|error`, `color.accent.default|hover`, `color.focus`, `color.map.ocean|land|border|written|selected`, `color.icon.fill`, `font.ui`, `font.essay`, `size.control` (32 px, the height of buttons and inputs; `size.control-touch`, 40 px, replaces it on touch screens), `size.icon-sm|md|lg` (16, 20 and 24 px; ADR 0016) and `opacity.disabled`.
- **Colours and font families: semantic tokens only.** Their primitives exist to feed the semantic tier.
- **Scales are used directly:** space, radius, font size, font weight, line height, shadow, duration and easing. They have no semantic tier (a `space.4` doesn't mean anything more specific), so components use `var(--space-4)` or `var(--radius-md)`. Raw values (`16px`, `#fff`) are never used.
- Component tokens are added only when a component needs a decision of its own.
- **Naming:** dot paths in DTCG, dashes in CSS: `color.text.muted` becomes `--color-text-muted`.
- **Colour is teal** (`DESIGN.md` has the table; the brief has what was rejected). The only other hue is a plain red, for errors only. `inverse` is the dark header block on panels. There's no second accent colour yet. Every pair that must pass contrast does:
  - text: body on white 14.4:1, muted on white 6.2:1 and on pale teal 5.5:1, white on the button teal 5.2:1, the header's secondary text 9.2:1, links at least 5.1:1 on every background (white, pale teal, the ocean), errors 5.6:1 on white;
  - input borders: 3.5:1 against white (WCAG 1.4.11);
  - map shapes: written against land 4.1:1, selected against written 3.5:1.
- **The fonts were placeholders at first** (system fonts), on purpose. They're now Montserrat and Source Serif 4 (ADR 0017). As intended, that changed values in `primitives.json`, not names, so nothing that uses the tokens had to change.
- **Light theme only for now.** Dark mode will be a second mode of the same semantic tokens.
- **Terrazzo builds the CSS** (`generated/tokens.css`, custom properties on `:root`). The output is **committed**, so the app and Storybook need no build step, and `pnpm tokens:check` (part of `pnpm check`) fails when it's out of step with the JSON.
- **No TypeScript output yet.** Terrazzo's JS plugin is meant for server-side use and is heavy, and nothing needs typed tokens yet. The Tokens story reads the JSON directly.
- **The app loads the CSS** through a side-effect import in `root.tsx`, so Vite bundles and hashes it.

## Alternatives considered
- **Wait for the palette before writing any tokens:** blocks the components for no gain, since the names don't depend on the values.
- **Pick a "safe" font now:** it would quietly become the design. A visibly unfinished system font doesn't.
- **Three tiers (primitive, semantic, component) from the start:** more ceremony than one app and a handful of components need. Component tokens are added when needed.
- **Generate the CSS at build time instead of committing it:** every consumer (dev, build, Storybook, tests) would need a pre-build step.

## Consequences
- **The app looked unfinished until the fonts landed** (ADR 0017), and that was intended.
- **Changing a colour or font later** is an edit to `primitives.json` (and `semantic.json` if roles shift), followed by `pnpm tokens`.
- **Contrast must be re-checked** whenever values change. The colour playground and the Tokens story help, and `DESIGN.md` lists the rules.
