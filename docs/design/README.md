# Design

Designs live on claude.ai as Claude Design canvases. They're private by default; Thor shares them from the canvas's Share menu.

| Canvas | What it shows | Decisions |
|---|---|---|
| [Map App: first sketches](https://claude.ai/artifact/Hp7xBLLRuyxsJvSSh7SCrt) | The map-first app: profile, essay, editor, and the phone bottom sheet, in light and dark | ADRs 0010, 0011, 0012 |

## Rules and brief

- **[`DESIGN.md`](../../DESIGN.md)** at the repo root holds the design rules: the values, what's never allowed, and how agents work on design (ADR 0018). Read it before any design work.
- **[`brief.md`](brief.md)** is the background: Thor's direction, and how the palette (teal, ADR 0014) and the fonts (Montserrat and Source Serif 4, ADR 0017) were chosen.
- **[`icons.md`](icons.md)** holds the rules for drawing icons (ADR 0016).

## Playgrounds in Storybook

For decisions that depend on real rendering (fonts on Windows and Mac, colours on real screens, contrast), `packages/ui` has Storybook playgrounds:

- **Fonts:** interface and essay candidates side by side, with any Google Fonts or system font, sizes, weights and themes, and whether each font really loaded.
- **Colour palettes:** palettes built from a few OKLCH dials, compared side by side on the map and an essay panel, in light and dark, with WCAG contrast for every pair.
- **Type scale:** a modular scale in the chosen fonts.

Storybook for `main` is at the `map-app-storybook` Worker in the Previews account, and every PR's preview comment links its own. The playgrounds load fonts from Google Fonts only for comparing; the app hosts its fonts itself (GDPR).

## How designs and code relate

- **Tokens flow one way:** from `packages/tokens` (the source of truth) into the design tools, never back by hand.
- **The canvas has mockups older than `DESIGN.md`,** and some details in them break it (see the end of `DESIGN.md`). Code follows `DESIGN.md`.
- **A design is a sketch, not a spec.** The specs in `docs/specs/` and the ADRs say what gets built. If a design and a spec disagree, ask Thor.
- **UI PRs link the design they implement,** and their screenshots are compared against it.
- **A canvas link always shows its latest version,** not the version a PR was built from.
