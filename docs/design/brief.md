# Design brief

Thor's direction for the look of the app. Colour and fonts are still open; this is what they should aim for. The tokens carry a greyscale placeholder until then (ADR 0014).

## Feel

**Modern, exciting but clean, minimal and stylish.**

## Colour

- **Popping, confident colours** on a clean, light base.
- **Inspiration:** Kurzgesagt's vividness and palette, with a touch of Duolingo's friendliness.
- **But:** never a clone of either, and **not too playful**. It's a tool for thoughtful writing, not a game.
- **Light mode first.** Dark mode comes later, as a second mode of the same semantic tokens.

## Fonts

- Friendly, geometric sans-serifs fit the brief (the font playground has candidates: Plus Jakarta Sans, Manrope, Sora, DM Sans, Outfit, Lexend…).
- **Inter is out:** it renders poorly on Windows.
- Chosen fonts are **self-hosted**, never loaded from Google's servers (GDPR).

## Avoid

- **"Grandma" colours:** muted, dusty, beige-and-sepia palettes.
- **The generic AI-generated look:** purple-to-blue gradients, glassy blur, Inter on slate grey, emoji as decoration, everything in rounded cards with soft shadows.

## Constraints that don't move

- **Contrast:** text at least 4.5:1, and map shapes at least 3:1 against their neighbours (WCAG 1.4.11), including "selected" against "written".
- **The map is the base of the app** (ADR 0010), so its colours (ocean, land, written, selected) carry most of the identity.
