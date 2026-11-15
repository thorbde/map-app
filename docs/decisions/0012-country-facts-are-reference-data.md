# 0012: Country facts are reference data, not user input

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the facts form in `docs/specs/mvp.md` §4

## Context
The MVP spec had writers fill in a facts form for every essay: capital, languages, population, independence, government and neighbours. Facts are facts, though. Typing them in is busywork, invites mistakes, and doesn't help memory much on its own. Remembering them does help, and that belongs in a dedicated memorization mode.

## Decision
- **Facts come from a static, reviewed dataset** in `features/countries`, next to `countries.ts`: capital, languages, population (with its year), independence date, government type and land neighbours, per ISO code.
- **The dataset is generated at build time** by a script from an openly licensed source, plus a small hand-written overrides file for corrections. Thor reviews the generated data before it's committed. The leading candidate is **Wikidata (CC0)**; the source is chosen in the countries milestone's plan.
- **Essay pages show the facts read-only** in the fact box. The editor shows them for reference.
- **The writer still writes the memory hook.** Writing it yourself is the point (the generation effect in `docs/METHOD.md`). `essay.data` / `draft_data` therefore hold the hook, and later the recall questions and riddles, not the facts.
- **A memorization mode comes later** (roadmap, Iteration 3): flashcards, quizzes and hide-and-reveal for the facts and your own essay. The normal essay view always just shows the facts.

## Alternatives considered
- **Writers type the facts in (the original spec):** busywork, and errors end up published.
- **Facts hidden by default, with a show/hide toggle:** a light memorization aid, but it makes reading worse for everyone else. A separate mode does it better.
- **Fetching facts from an API at request time:** slower, another runtime dependency, and data that can change without review.

## Consequences
- **Facts are the same for everyone** and can be corrected in one place.
- **They can go stale,** for example population figures. The year is shown next to each population figure, and the dataset is regenerated deliberately, never automatically.
- **Licensing:** the source's licence and attribution go in the dataset file and on the `/about` or `/method` page if the licence requires it.
- **`docs/METHOD.md` still describes facts as part of the writer's frontmatter.** Thor decides whether to update it, since agents don't edit that file without asking.
