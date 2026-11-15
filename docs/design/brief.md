# Design brief

Thor's direction for the look of the app. **Colour is chosen** (below); fonts are still open and carry a placeholder in the tokens (ADR 0014).

## Feel

**Modern, exciting but clean, minimal and stylish.**

## Colour

- **Popping, confident colours** on a clean, light base.
- **Inspiration:** the Kurzgesagt store (its vividness, palette and illustration), and Duolingo's cartoony style with happy, optimistic, animated little details.
- **But:** never a clone of either, and **not too playful**. It's a tool for thoughtful writing, not a game.
- **Light mode first.** Dark mode comes later, as a second mode of the same semantic tokens.

## The palette (chosen)

Picked on the design canvas ("Teal, no accent, deep header"), after six rounds of comparing hues on the same essay screen.

| Role | Colour | Where |
|---|---|---|
| Brand teal | `#0E8C7F` | Written countries on the map |
| Button teal | `#0B7A6F` | Buttons and links (white text reaches 4.5:1) |
| Deep teal | `#0B2F2C` | The header block on panels, the selected country, body text |
| Pale teal | `#DFF5F0` | Quiet areas: the fact box, pills |
| Ocean | `#D3EEF5`, borders `#ADD6E0` | The map's sea, with white land |
| Muted text | `#4A6663` | Dates, labels, secondary text |

- **No second accent colour for now.** Every one tried (coral, orange, yellow, pink, lilac, lime, blue, magenta, gold) was rejected. A second colour may come back for moments of delight (publishing, milestones), chosen in that context.
- **Keep the dark header block** on panels; it's part of the look.
- **Rejected:** violet and indigo with gold (too close to Kurzgesagt), violet as the base, mint or pink oceans, teal as bright green (reads like a geography quiz).

## Fonts

- Friendly, geometric sans-serifs fit the brief (the font playground has candidates: Plus Jakarta Sans, Manrope, Sora, DM Sans, Outfit, Lexend…).
- **Inter is out:** it renders poorly on Windows.
- Chosen fonts are **self-hosted**, never loaded from Google's servers (GDPR).

## Avoid

- **"Grandma" colours:** muted, dusty, beige-and-sepia palettes.
- **The generic AI-generated look:** purple-to-blue gradients, glassy blur, Inter on slate grey, emoji as decoration, everything in rounded cards with soft shadows.
- **Neo-brutalism:** thick black outlines on everything, hard offset shadows, chunky bordered buttons. Tried in the "Bold" canvas row and rejected.

## Constraints that don't move

- **Contrast:** text at least 4.5:1, and map shapes at least 3:1 against their neighbours (WCAG 1.4.11), including "selected" against "written".
- **The map is the base of the app** (ADR 0010), so its colours (ocean, land, written, selected) carry most of the identity.
