# 0018: Design rules as constraints, in DESIGN.md

- **Status:** accepted
- **Date:** 2026-11-16
- **Builds on:** ADR 0008 (the design system), ADR 0014 (tokens), ADR 0016 (icons), ADR 0017 (fonts)

## Context
Agents do the design work in this repo, and agent-made design has a recognisable default look. Thor shared an article that names its tells:
- a warm off-white background;
- a rust-orange accent;
- a serif headline with one italic word;
- tracked-out uppercase "eyebrow" labels;
- soft cards in a grid;
- pill badges everywhere;
- a logo ticker.

The article's fix is the same for each: **replace mood words with constraints** (values and explicit bans), keep them in one file that's read for every design task, be explicit about which layer of a reference to copy, and re-read the file when a long session drifts.

We'd already met most of this the hard way. "Modern, clean, popping" produced palettes Thor disliked; a store screenshot given as a colour reference brought its layout along; and the first mockups carried several of the tells (uppercase tracked labels, a decorative pill).

The direction lived in `docs/design/brief.md` as a mix of mood, values and a short "avoid" list. Nothing told an agent which one wins.

## Decision
- **`DESIGN.md` at the repo root** holds the design rules, next to `ARCHITECTURE.md` and `CLAUDE.md`:
  - **the values:** hues, type, space, radius, shadow and motion, as numbers and tokens;
  - **a "Never" table:** each of the article's tells, plus the looks Thor already rejected, each with what we do instead;
  - **working rules:** describe designs in values; a reference is one layer; one screen, then stop; check before showing; keep the file true.
- **Rules beat mood words.** `brief.md` keeps the direction and the history, and says that `DESIGN.md` wins where they disagree.
- **The article's fixes are adapted, not copied.** It's about marketing pages, and this is an app. Where its advice doesn't fit, the rule keeps the principle:
  - **"No pill badges"** becomes "if it looks like a pill, it does something". Our buttons are pills, by Thor's choice.
  - **"No card grids"** becomes "the panel is the container": panels floating on the map are the app's structure (ADR 0010).
  - **"No serif fonts, no italics"** becomes "no serif headings, no italics in the interface". The essay body stays in a serif (ADR 0017), and writers' own italics stay.
  - **Its example values** (Space Grotesk, a blue primary, square corners) aren't ours. Ours are the tokens.
- **Enforced by reading and review, for now:**
  - `CLAUDE.md` lists `DESIGN.md` under "Read first" and has a hard rule against showing or shipping UI that breaks it.
  - The PR template has a checkbox for it.
  - The automated review reads `CLAUDE.md` and the ADRs, so it can flag breaches.

## Alternatives considered
- **Extend `brief.md`:** it would stay a mix of mood and rules, in a place agents don't read by default.
- **Only tokens, no prose rules:** tokens can say which colours exist, but not "no pill unless it's pressable" or "a reference is one layer".
- **Copy the article's fixes as written:** they'd contradict decisions Thor has made (pill buttons, teal, Montserrat).
- **A lint script now** that scans CSS for the mechanical rules (uppercase, letter-spacing, italics, gradients, raw colours): worth doing, but it's a new check with its own tests, so it's proposed separately rather than slipped in here.

## Consequences
- **Three approved mockup details change when they're built:**
  - the "West Africa" pill becomes plain text, because it can't be pressed;
  - the fact labels lose their capitals and wide letter-spacing;
  - so do the map's country labels.

  `DESIGN.md` says the canvas predates the rules.
- **`DESIGN.md` repeats values that live in the tokens,** so it can drift. It says the tokens win, and the proposed lint could check it.
- **The rules bind agents, not Thor.** He can overrule any of them; the file is then changed, not ignored.

## Update, 2026-11-16
Thor saw the essay screen rebuilt to these rules, approved it, and named the design language **"Schoolbook comes alive"**: a high-quality geography textbook, which comes alive over time with playful animation at moments that matter. That settles the open points above:
- the three mockup details change as described;
- the serif essay text stays;
- three choices the rules didn't cover are now in `DESIGN.md`: the fact box's radius, the essay text size, and the labels on the map.
