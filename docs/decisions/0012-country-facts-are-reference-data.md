# 0012: Country facts are reference data, not user input

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the facts form in `docs/specs/mvp.md` §4

## Context
The MVP spec had writers fill in a facts form for every essay: capital, languages, population, independence, government and neighbours. Facts are facts, though. Typing them in is busywork, invites mistakes, and doesn't help memory much on its own. Remembering them does help, and that belongs in a dedicated memorization mode.

## Decision
- **Facts come from a static, reviewed dataset** in `features/countries`, next to `countries.ts`: capital, languages, population (with its year), independence date, government type and land neighbours, per ISO code.
- **The source is Wikidata** (CC0, so free to use with no conditions). `scripts/build-facts.ts` queries it and writes `facts.ts`. A small hand-written **overrides file** corrects or pins values, and always wins over Wikidata.
- **Facts are refreshed regularly:** a scheduled GitHub Actions job (monthly to start with) re-runs the script and, if anything changed, opens a PR showing exactly which facts changed. Thor reviews and merges it like any other PR. Nothing reaches users without that review.
- **Essay pages show the facts read-only** in the fact box. The editor shows them for reference.
- **The writer still writes the memory hook.** Writing it yourself is the point (the generation effect in `docs/METHOD.md`). `essay.data` / `draft_data` therefore hold the hook, and later the recall questions and riddles, not the facts.
- **A memorization mode comes later** (roadmap, Iteration 3): flashcards, quizzes and hide-and-reveal for the facts and your own essay. The normal essay view always just shows the facts.

## Alternatives considered
- **Writers type the facts in (the original spec):** busywork, and errors end up published.
- **Facts hidden by default, with a show/hide toggle:** a light memorization aid, but it makes reading worse for everyone else. A separate mode does it better.
- **Fetching facts from Wikidata at request time:** slower, another runtime dependency, and data that can change (or be vandalised) without review.
- **Other sources** such as REST Countries: less complete or with licences that need attribution. Wikidata covers every field we need, under CC0.
- **Refreshing by hand only:** facts like population quietly go stale.

## Consequences
- **Facts are the same for everyone** and can be corrected in one place.
- **Wikidata is crowd-edited,** so a value can be wrong or vandalised on the day we fetch it. The monthly PR shows every change for review, and the overrides file fixes anything persistent.
- **Population figures carry their year,** shown next to the number.
- **Wikidata's structure varies by country** (for example several capitals, or several official languages with different statuses). The script's rules for those cases are decided in the M1 plan and covered by tests.
- **Licensing:** CC0 needs no attribution, but we credit Wikidata on the `/method` page anyway.
- **A scheduled PR opened with the default Actions token doesn't trigger other workflows,** so CI won't run on it automatically. The M1 plan picks the fix: for example opening it as the Claude GitHub App, or Thor re-running checks.
- **`docs/METHOD.md`** was updated in the same PR to match (with Thor's approval).
