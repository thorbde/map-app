# 0016: Our own icon set, drawn by agents and approved by Thor

- **Status:** accepted
- **Date:** 2026-11-15
- **Builds on:** ADR 0008 (the design system as packages), ADR 0014 (tokens), ADR 0015 (stories are tests)

## Context
The app needs icons: errors, navigation, editing, showing and hiding facts. Thor wants an icon style of our own, not the library every other app uses. The style was settled on the design canvas:
- duotone by default and solid for active;
- 2 px lines;
- no sharp corners;
- dots 1.25 × the line width.

The rules are in `docs/design/icons.md`. Agents draw the icons; Thor approves each one.

## Decision
- **A separate package, `@thorbde/icons`,** next to tokens and ui, so other apps can use the icons too. It imports nothing from the repo.
  - `@thorbde/ui` may import it.
  - A new boundary rule enforces both, with fixtures. The old `ui-only-to-tokens` rule is now `ui-only-to-tokens-and-icons`.
- **Three stages:**
  1. **`tools/icons.json` and `tools/draw.py`:** the authoring tool. It describes each icon as parts (`open`, `closed`, `inner`, `split`, `dot`, `slash`) and draws both variants with real geometry: the fill, minus the cuts, with every corner then rounded. It's Python, using Shapely 2.2.0 for the geometry and svgpathtools 1.8.0 to read paths. Agents run it locally; it isn't part of the build or CI.
  2. **`svg/`:** the drawn SVGs, committed and approved by Thor in the PR.
  3. **`scripts/build.mjs`:** about 100 lines of our own, with no dependencies. It checks every SVG against the rules (24 px viewBox, allowed elements and attributes, only `currentColor` and `var(--color-icon-fill)`, both variants present) and generates one React component per icon in `generated/`. The output is committed, and `pnpm icons:check` (in `pnpm check`) fails when it's out of step with `svg/`, like the tokens.
- **One component per icon** (`MapIcon`), so pages only load the icons they use.
- **The API:**
  - `variant`: `duotone` or `solid`.
  - `size`: `sm`, `md` or `lg`, from the new `size.icon.*` tokens.
  - `label`: announced by screen readers. Without one, the icon is hidden from them.
- **New tokens:** `color.icon.fill` (`teal.200`) and `size.icon-sm|md|lg` (16, 20 and 24 px).

## Alternatives considered
- **An icon library (Lucide, Phosphor, Material Symbols):** fast, but exactly what Thor doesn't want: they look like every other app.
- **SVGR to convert the SVGs:** a well-known tool, but a dependency with its own config, for a job our script does in about 100 lines while also checking the rules.
- **Icons drawn by hand in Figma, with no tool:** "no sharp corners" would then be a manual check on every icon. The tool makes it repeatable.
- **The geometry in JavaScript, so it runs in CI:** possible with a polygon-clipping library, but more code and a new dependency for something that only runs when an icon is drawn. Python and Shapely are the standard tools for this geometry.
- **An icon font:** worse for accessibility and for two-tone drawings, and it loads every icon on every page.

## Consequences
- **Drawing an icon needs Python** (`tools/requirements.txt`), but building and using them doesn't.
- **CI checks the SVGs and the components, not the drawing.** If someone hand-edits an SVG, the tool's output would differ, but CI can't tell. Thor's visual approval is the guard, and `icons.md` says to always redraw with the tool.
- **Bundle size:** all 14 icons in both variants are about 9 KB gzipped together. A page only bundles the icons it imports, at roughly 0.3–0.6 KB each.
- **The solid shapes are polygons** (curves become many short straight segments, simplified to 0.015 units). That's invisible at icon sizes, but the SVGs are hard to hand-edit, which is another reason to always redraw with the tool.
