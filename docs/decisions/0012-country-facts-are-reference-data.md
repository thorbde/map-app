# 0012: Country facts are reference data, not user input

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the facts form in `docs/specs/mvp.md` §4

## Context
The MVP spec had writers fill in a facts form for every essay: capital, languages, population, independence, government and neighbours. Facts are facts, though. Typing them in is busywork, invites mistakes, and doesn't help memory much on its own. Remembering them does help, and that belongs in a dedicated memorization mode.

## Decision
- **Facts come from a static, reviewed dataset** in `features/countries`, next to `countries.ts`: capital, languages, population (with its year), ~~independence date,~~ government type and land neighbours, per ISO code.
- **The source is Wikidata** (CC0, so free to use with no conditions). `scripts/build-facts.ts` queries it and writes `facts.ts`. A small hand-written **overrides file** corrects or pins values, and always wins over Wikidata.
- **Facts are refreshed regularly:** a scheduled GitHub Actions job (monthly to start with) re-runs the script and, if anything changed, opens a PR showing exactly which facts changed. Thor reviews and merges it like any other PR. Nothing reaches users without that review.
- **Essay pages show the facts read-only** in the fact box. The editor shows them for reference.
- **The writer still writes the memory hook.** Writing it yourself is the point (the generation effect in `docs/METHOD.md`). `essay.data` / `draft_data` therefore hold the hook, and later the recall questions and riddles, not the facts.
- **A memorization mode comes later** (roadmap, Iteration 3): flashcards, quizzes and hide-and-reveal for the facts and your own essay. The normal essay view always just shows the facts.

## Added in M1 PR 2 (2026-11-16): what building it showed

- **No independence date.** Thor dropped it: Wikidata's nearest property, "inception", gives 843 for France and nothing useful for countries that were never colonised. A writer who cares about it puts it in the essay. The facts are capital, languages, population, government and neighbours.
- **The rules** (`scripts/facts-rules.ts`, covered by tests against saved real answers):
  - only current statements count (no end date, not deprecated), and preferred rank wins;
  - **capitals and languages:** every current one, sorted by name;
  - **population:** the newest figure among the current statements, with its year. Not simply the newest of all: Wikidata also holds mistaken figures at normal rank (37 million for Tunisia);
  - **government:** Wikidata has up to seven values per country. We show one, the first the country has from a fixed list that runs from specific to general. A value the script hasn't seen before counts as unusable until a person adds it to the list;
  - **neighbours:** a border counts when it is not marked as a sea border and is stated from both sides.
- **Countries are looked up by Wikidata item,** from a hand-checked list (`scripts/wikidata-ids.ts`), not by ISO code. Looking up by code timed out, and the code NL sits on the Kingdom of the Netherlands.
- **Wikidata needed more correcting than expected:** about 100 overrides in the first version, mostly sea borders listed as borders (about 45 countries) and missing forms of government (41). Each override carries its reason. If the neighbour data stays this poor, deriving neighbours from the map geometry is the likely fix, as its own decision.
- **How the monthly job stays non-breaking:**
  - the script writes `facts.ts` only when every country in the list has a complete entry, so the file is never half-written;
  - a missing, malformed or wildly different value (a population change over a quarter, an older figure, several neighbours gone at once) **keeps the value we have**, and the pull request lists it under "Kept the old value, needs a look";
  - borders are settled as pairs, so keeping one country's old list can't leave a border stated from one side;
  - if Wikidata doesn't answer, the run fails and opens nothing;
  - the job never merges. Tests fail the pull request if any entry is incomplete or out of step with the overrides.
- **How the job's pull request gets CI: no token.** The job opens the pull request with the default Actions token and then starts the CI workflow on its branch through `workflow_dispatch`, which that token may do. It needs one repository setting, "Allow GitHub Actions to create and approve pull requests". **Proven on 2026-11-16:** a deliberately wrong figure was merged (#22), and the job opened #23 to correct it, with `check` and `e2e` running on it and accepted by the `main` ruleset. If that ever stops working, the fallback is a GitHub App owned by Thor.
- **No AI in the job:** `node`, `git` and `gh`, with no third-party actions and no install step (the script has no dependencies).

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
