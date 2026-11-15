# 0017: Fonts: Montserrat and Source Serif 4, self-hosted

- **Status:** accepted
- **Date:** 2026-11-15
- **Builds on:** ADR 0008 (the design system as packages), ADR 0014 (tokens)

## Context
The tokens carried system fonts as placeholders until the fonts were chosen (ADR 0014). Two constraints were already set, in `docs/design/brief.md`:
- Fonts are **self-hosted**, never loaded from Google's servers (GDPR).
- Two weights only: 400 and 700.

Thor chose **Montserrat** for the interface, after seeing it in the design mockups, and left the essay font to the agent's judgement.

## Decision
- **Interface: Montserrat** (`font.ui`), 400 and 700.
- **Essays: Source Serif 4** (`font.essay`), 400, 400 italic and 700. Why this one:
  - Montserrat is wide and geometric: good for labels and headings, tiring over 500 words. A serif made for body text reads more easily at length.
  - It's a calm, modern serif that pairs well with a geometric sans, and it renders cleanly on Windows (the reason Inter was ruled out).
  - Essay headings stay in Montserrat, so essays still look like part of the app.
  - It's one token (`font.family.serif`), so it's easy to change if Thor doesn't like it on real screens.
- **Self-hosted through Fontsource packages:** `@fontsource/montserrat` 5.3.0 and `@fontsource/source-serif-4` 5.3.1, both under the SIL Open Font License. They're dependencies of `@thorbde/ui`.
- **`@thorbde/ui/fonts.css`** imports the five font faces. Apps import it once, next to the tokens and `base.css`. Vite bundles and hashes the font files, so they're served from our own domain.
- **Every script the fonts support is included** (Latin, extended Latin, Cyrillic, Vietnamese, Greek), each in its own file with a `unicode-range`. A browser only downloads the scripts a page uses.
- **`font-display: swap`:** text shows at once in the fallback font, and swaps when the font arrives.
- **An e2e test guards the GDPR rule:** it fails if the home page requests anything from another site, or if Montserrat doesn't load.

## Alternatives considered
- **Google Fonts' CDN:** ruled out by the brief: it sends every visitor's IP address to Google.
- **Montserrat for essays too:** one font fewer to load, but worse for long reading (above).
- **Copying the font files into the repo:** no dependency, but updates and the per-script splitting would be manual work. Fontsource is the same files from Google Fonts, packaged.
- **Variable fonts** (`@fontsource-variable/*`): one file covers every weight, but we only use two, so there's nothing to gain. Measured for Latin, WOFF2: Montserrat's variable file is 38 KB, the same as our two static weights together (2 × 19 KB). Source Serif 4's upright variable file is 51 KB, against 42 KB for the two static weights.
- **Other essay fonts:** Literata and Newsreader are also good; Georgia (the old placeholder) needs no download but looks dated. Any of them is a one-token change.

## Consequences
- **Font downloads** (Latin, WOFF2): Montserrat 400 and 700 are about 19 KB each. Source Serif 4 is about 20 KB (400), 20 KB (italic) and 22 KB (700). So:
  - a page with only interface text loads about 38 KB of fonts;
  - an essay page loads up to about 100 KB, and less if the essay has no italic or bold.
- **Fonts aren't part of the 150 KB JavaScript budget** (ADR 0013), and they don't block rendering.
- **A brief flash of the fallback font** on a first visit, and a small layout shift when the font swaps in. If that becomes noticeable, the fixes are preloading the two interface files and metric-matched fallbacks (`size-adjust`). Lighthouse CI (M5) will measure it.
- **The build output has more files:** each font face comes in up to 6 scripts and 2 formats (WOFF2, plus WOFF for very old browsers). Only the ones a page needs are downloaded.
- **knip can't see CSS imports,** so the two Fontsource packages are listed under `ignoreDependencies` for `packages/ui` in `knip.json`.

