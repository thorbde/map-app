# DESIGN.md: design rules for agents working in this repo

Agents design by default, and the default has a recognisable look: warm off-white pages, a rust-orange accent, serif headlines with one italic word, tracked-out capitals, soft cards, pills everywhere. Thor doesn't want that look. These rules exist so that every visual choice in this app is a decision somebody made, not a default (ADR 0018).

**Read this before any design or UI work, in every session,** and again whenever the conversation has been summarised or has run long: defaults creep back in.

## The idea: "Schoolbook comes alive"

Thor's name for the design language. The app looks like **a high-quality geography textbook**: a clear map with labels, a fact box, calm headings, and body text set for reading. Over time it **comes alive** with playful animation at the moments that matter.

The name is the direction, not a rule. The rules below are what it means in practice:

- **The schoolbook** is the values and the "Never" table: flat colour, a serif for the essay text, sentence case, labels on the map, one fact box, no decoration.
- **"Comes alive"** is the motion rule: animation is feedback to something the user did, or marks a moment such as publishing an essay or reaching a milestone. It's added one moment at a time, each one shown to Thor first. It is never looping or ambient.

The reference for the look is the board **"Essay · the approved look, following DESIGN.md"** on the design canvas, which Thor approved.

## How these rules work

- **Rules are constraints, not vibes.** A value, a token or a "never", not an adjective. "Modern" and "clean" decide nothing; `var(--radius-lg)` does.
- **When a rule here conflicts with a mood word** (in `docs/design/brief.md`, a prompt, or your own instinct), **the rule wins.**
- **When no rule covers a choice, don't fall back on the default.** Propose the choice to Thor as concrete values, and add the answer here in the same PR.
- **Thor decides.** If a rule seems wrong for a case, stop and ask. Don't bend it quietly.

## The values

The tokens are the source of truth (`packages/tokens/tokens/`, ADR 0014). This is the short version, so the constraints are in front of you. If the two ever differ, the tokens are right and this file has a bug: fix it.

**Colour.** The only hues are **teal**, the **sky blue of the ocean**, **neutral grey** for hairlines, and **red for errors only**. There is no second accent colour.

| Role | Value |
|---|---|
| Page (the ocean) | `#D3EEF5` |
| Panels and dialogs | `#FFFFFF` |
| Quiet blocks (the fact box), secondary buttons | `#DFF5F0`, hover `#CEE9E3` |
| Tags in the fact box | `#CEE9E3` |
| Header block on panels | `#0B2F2C` |
| Text | `#0B2F2C`, muted `#4A6663` |
| Links | `#096A60` |
| Primary buttons, focus ring | `#0B7A6F`, hover `#096A60` |
| Written countries | `#0E8C7F`; selected `#096A60` |
| Errors | `#C62828` |
| Input borders | `#748E8B`; hairlines `#D4D4D4` |

**Contrast.** Text is at least 4.5:1 against its background. Map shapes and control borders are at least 3:1 against their neighbours (WCAG 1.4.11). Every pair above passes; a new pair is checked before it's used.

**One exception, decided by Thor (2026-11-17): "selected" against "written" is 1.6:1.** The colour that reached 3:1 (`#0B2F2C`) was too dark on the map. The selected country is told apart by its label instead: white, bold and larger. Selected still reaches 3:1 against unwritten land (6.5:1) and the ocean (5.3:1).

**Type.**
- **Montserrat** for everything in the interface, including every heading. Two weights: 400 and 700.
- **Source Serif 4** for the body text of essays, and nothing else (ADR 0017). Essay text is 16 px (`font.size.md`) with a line height of 1.65; essay headings are Montserrat 700 at 20 px.
- **Sizes:** 12, 14, 16, 20, 25, 31, 39 px (`font.size.xs` to `3xl`). **Line heights:** 1.15, 1.5, 1.65.

**Shape and space.**
- **Space:** a 4 px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radius:**
  - pill (`radius.full`) for buttons, chips and tags that are links;
  - 10 px (`radius.md`) for inputs and the fact box;
  - 16 px (`radius.lg`) for panels and dialogs;
  - 6 px (`radius.sm`) for small things like focus outlines on text, and for tags that can't be pressed.
- **Controls:** 32 px tall with a mouse, 40 px on touch screens.
- **Shadow:** one, `shadow.raised`, and only on things that float over the map: panels, dialogs, the tab bar.
- **Motion:** 120, 200 or 320 ms, with `easing.standard`.
- **Icons:** our own (`docs/design/icons.md`). 16, 20 or 24 px.

**The panel, chips and tags** (Thor, 2026-11-18).
- **The panel:** white, `radius.lg`, `shadow.raised`, 24 rem wide (`size.panel`). Its header block is `color.bg.inverse` with the title at 25 px, 700, and an optional line under it at 14 px in `color.text.on-inverse-muted`. No hairline edge: the shadow alone.
- **Continent chips:** links. 32 px tall (40 px on touch), pill, 14 px, 700, white with `shadow.raised` because they float over the map. The current one is `color.bg.inverse` with white text. No hairline edge.
- **The continent chips collapse into the current one** (Thor, 2026-11-18), to leave the map free. The rest slide out beside it in 200 ms (at once with reduced motion) when the pointer is over it, when the keyboard focus arrives, or when it is pressed; the current chip doesn't move.
- **Tags that are links** (a country's neighbours): 24 px tall (32 px on touch), pill, 12 px, 700, `color.bg.subtle`, no shadow. Clearly smaller than a chip.
- **Tags that can't be pressed** (several values of one fact): 20 px tall and always one line, square corners, 12 px, 400, `color.bg.tag` (one step darker than the fact box), in the fact box only. More than three are held back behind a button that reads as a link: "9 more", then "Show fewer".
- **Text in a panel is 14 px** (`font.size.sm`): fact values, links, and the `h2`s (700). Labels and tags are 12 px. Only the title in the header block is larger. Essay text keeps its own size.
- **The fact box:** each label (12 px, `color.text.muted`) sits above its value (14 px), so a value has the box's full width.
- **The world and continent panels show countries as their own outlines,** with the name under each, not as a list of links.

**Labels on the map.** 12 px, sentence case.
- On land that isn't written: text colour with a 3 px white outline, so borders don't cut through the letters.
- On a written country: the same. White text on the teal would only reach 4.1:1, under the minimum.
- On the selected country: white, 16 px, 700, inside the shape (6.5:1), with an outline in the selected colour for the letters that reach outside it.
- **Which names show:** by Natural Earth's zooms and ranks, as on Google Earth: the prominent countries first, more as the viewer zooms in. Where two would overlap, the lower-ranked one gives way until there is room. A written country is named at every zoom and goes before every unwritten one; the selected country is always named.
- **No marker dots.** A country too small to click is opened by its name.

## Never

Each of these is a known tell of a design nobody decided on. The "instead" is what we do.

| Never | Instead |
|---|---|
| **Warm neutral backgrounds:** beige, cream, off-white, "paper" | White panels on the sky-blue page; pale teal for quiet blocks |
| **Terracotta, rust or burnt orange** (`#C15F3C` and anything near it), or any new accent hue | Teal. A second colour needs Thor, and so far he has rejected every one |
| **Serif headings,** or a headline with one italic or highlighted word | Montserrat headings. Emphasis by weight (700) or size, never by italics |
| **Italics in the interface** | Italics exist only inside essay text, where the writer put them |
| **Tracked-out capitals:** small uppercase labels with wide letter-spacing, "eyebrow" labels above headings | Sentence case and normal letter-spacing everywhere. Hierarchy comes from size and weight. A label is small, muted text |
| **Card grids, cards inside cards,** a soft-shadowed box as the default container | A panel is the container (ADR 0010). Inside it, separate things with space, a hairline, or one pale teal block for reference data (the fact box) |
| **Decorative pills and badges:** tag chips, "New" or "AI" badges, benefit words as chips | **If it looks like a pill, it does something:** pills are buttons, button-links, chips and tags that are links. Information that can't be pressed is plain text. **One exception (Thor, 2026-11-18): several short values of one fact in the fact box,** such as a country's languages, are set as tags: 12 px, regular weight, square corners (`radius.sm`), one step darker than the pale block (`color.bg.tag`). Never a pill, never bold, and nowhere else |
| **Tickers, marquees, looping or ambient animation** | Motion only as feedback to something the user did, or to mark a moment (publishing, a milestone). It respects `prefers-reduced-motion` |
| **Emoji in interface text or as icons** | Words, and our own icons |
| **Gradients, glassy blur, glow** | Flat colour |
| **Neo-brutalism:** thick black outlines, hard offset shadows | Flat shapes with no outline; one soft shadow on floating things |
| **Muted, dusty "grandma" palettes; Inter; an icon library** | The values above; our own icons |
| **Slogans and filler copy:** "Software that feels human", benefit adjectives ("fast", "secure"), dash-and-pause poetry | Copy says what the thing is or does. Every claim is a full sentence, or it's cut. Headings are at most 8 words |

## Working rules

1. **Say it in values.** When you propose or describe a design, to Thor or in a PR, name the tokens and values, not the feeling. Not "a softer header", but "`color.bg.subtle` instead of `color.bg.inverse`".
2. **A reference is one layer.** When Thor shares a screenshot or names a product, ask which layer he means if he hasn't said: layout, colour, type or imagery. Take only that layer and apply our tokens to the rest. A reference's colours, fonts and illustrations never come along by default. (We learned this with the Kurzgesagt store: it was a reference for colour, and the layout came along uninvited.)
3. **One screen, then stop.** Show Thor one screen or one component in a new direction and wait for his reaction before making more.
4. **Check before you show.** Before showing Thor a design or opening a PR with UI in it, go through the "Never" table row by row against what you made. Say in the PR that you did.
5. **Keep this file true.** A new visual decision is added here in the same PR that makes it. A rule Thor overrules is changed here, not ignored.

## What's older than these rules

The design canvas has mockups from before this file existed, and some break it: capitals with wide letter-spacing on the fact labels and map labels, and a "West Africa" pill that can't be pressed. They show how the colours and layout were chosen, not approved details. The board "Essay · the approved look, following DESIGN.md" replaces them as the reference, and code follows this file.
