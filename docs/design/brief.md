# Design brief

Thor's direction for the look of the app, and the history of how the look was chosen.

**The rules are in [`DESIGN.md`](../../DESIGN.md)** at the repo root: the values, what's never allowed, and how agents work on design. This file is the background. Where the two disagree, `DESIGN.md` wins.

## Feel

**Modern, exciting but clean, minimal and stylish.**

- **Popping, confident colours** on a clean, light base.
- **Inspiration:** the Kurzgesagt store (its vividness, palette and illustration), and Duolingo's cartoony style with happy, optimistic, animated little details.
- **But:** never a clone of either, and **not too playful**. It's a tool for thoughtful writing, not a game.
- **An app, not a storefront:** calm headers, sentence case, and decoration saved for moments such as publishing or a milestone.
- **Light mode first.** Dark mode comes later, as a second mode of the same semantic tokens.
- **The map is the base of the app** (ADR 0010), so its colours (ocean, land, written, selected) carry most of the identity.

## How the palette was chosen

Picked on the design canvas ("Teal, no accent, deep header"), after six rounds of comparing hues on the same essay screen. The values are in `DESIGN.md` and the tokens (ADR 0014).

- **Teal** for written countries, buttons and the dark header block, with a pale sky-blue ocean and white land.
- **No second accent colour.** Every one tried (coral, orange, yellow, pink, lilac, lime, blue, magenta, gold) was rejected. A second colour may come back for moments of delight, chosen in that context.
- **The dark header block on panels stays;** it's part of the look.
- **Rejected:**
  - violet and indigo with gold (too close to Kurzgesagt);
  - violet as the base;
  - mint or pink oceans;
  - teal as a bright green (reads like a geography quiz);
  - the "Bold" canvas row (neo-brutalism).

## Fonts

Chosen (ADR 0017):

- **Interface: Montserrat,** in two weights, 400 and 700. A friendly, geometric sans-serif.
- **Essays: Source Serif 4,** for comfortable long reading. Essay headings stay in Montserrat.
- **Inter is out:** it renders poorly on Windows.
- Fonts are **self-hosted**, never loaded from Google's servers (GDPR).
