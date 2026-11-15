# Icons

Our own icon set, `@thorbde/icons` (ADR 0016). No icon library. These rules keep every icon recognisably ours.

## Who draws them

- **Agents draw the icons** with `packages/icons/tools/draw.py`, following these rules.
- **Thor approves every new or changed icon** before it merges. The PR shows the approval sheet: every new or changed icon in both variants at 56, 24, 20 and 16 px (`draw.py --sheet`), and the Storybook gallery (Foundations → Icons).

## Style

- **Two variants of every icon:**
  - **Duotone**, the default: a 2 px outline over a soft fill (`color.icon.fill`).
  - **Solid**, for **active and selected** states: the current tab, a toggle that's on, a saved item. Switching variant with the state means the change isn't carried by colour alone.
- **Grid:** 24 × 24, with shapes inside roughly 2 to 22.
- **Lines:** 2 px, with round ends and round joins. In the solid variant, open lines (arrows, check, close) are 2.5 px.
- **Dots** are 1.25 × the line width (2.5 in duotone), because a dot looks smaller than a line of the same width.
- **No sharp corners, ever.** Every corner, including the ones a cut creates, is rounded (radius 0.6).

## Cuts in the solid variant

A solid icon is a real shape: the fill, minus its cut-out details, with every corner then rounded. Details are never white lines drawn on top.

- **Detail cuts** (`inner` in `icons.json`) have **rounded ends**: the globe's meridians, the line across the pen, the exclamation mark. They may run through the edge of the shape.
- **Split cuts** (`split`) are **straight, even-width lines with flat ends** that run right through the shape: the folds of the map.
- **Slashes** (`slash`, as in "eye-off") cut a gap around themselves, in both variants.

## Sizes

`size="sm" | "md" | "lg"`: 16, 20 and 24 px (`size.icon.*`). Every icon is drawn once, on the 24 px grid. If one ever blurs at 16 px, it gets a drawing of its own at that size.

## In code

```tsx
import { MapIcon } from "@thorbde/icons";

<MapIcon />                       // duotone, 20px, hidden from screen readers
<MapIcon variant="solid" />       // active or selected
<MapIcon label="Map" />           // only when the icon means something on its own
```

- The line takes the text colour (`currentColor`).
- The duotone fill is `--color-icon-fill`. A surface can set its own, for example a lighter teal on a teal button.

## Adding or changing an icon

1. Describe it in `packages/icons/tools/icons.json`. Each part is `open`, `closed`, `inner`, `split`, `dot` or `slash` (see the top of `draw.py`).
2. Run the tool:
   ```
   cd packages/icons/tools
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   .venv/bin/python draw.py --sheet sheet.html
   ```
   It writes `packages/icons/svg/`.
3. Run `pnpm icons` to regenerate the components.
4. Look at the sheet and the Storybook gallery yourself first, at every size.
5. Put both in the PR for Thor's approval.
