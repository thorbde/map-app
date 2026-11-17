# 0020: Map geometry, and how borders are drawn

- **Status:** accepted
- **Date:** 2026-11-16
- **Risk:** **high** for every border choice. Thor wants them revisited (see "When to revisit").
- **Builds on:** ADR 0019 (Kosovo and Taiwan are countries in the list), ADR 0021 (MapLibre draws the map)

## Context
`scripts/build-maps.ts` turns Natural Earth's country shapes into the map the whole app stands on (M1 PR 3). A map can't avoid taking a position on contested areas. The source data mostly draws borders as they are controlled on the ground, which is not how every reader, or every country's law, expects them.

Thor's instruction (2026-11-16): **contested borders, areas and data are to be treated with great care, and every choice is recorded here, as a high-risk decision to revisit.** This ADR is the full record. A border choice that isn't in the tables below is a bug.

**Where the data comes from:** Natural Earth, a public-domain dataset, through the `world-atlas` package (version 2.0.2, built from Natural Earth 4.1.0, from 2018). It has one point of view. Natural Earth 5 also publishes the borders as seen from different countries; `world-atlas` doesn't include those.

## Decision

### The rule
**Draw what the source data has, except for the choices in the first table.** Everything that isn't one of the countries in the list (ADR 0019) is **neutral land:** not clickable, and never coloured.

**How to change a border:** edit the settings at the top of `scripts/build-maps.ts`, update the table here, and add or change the matching test in `app/features/maps/geometry.test.ts`. Every row below has a test that checks a real place on the ground.

### Choices that differ from the source data

| Area | The source data | We draw | Decided by |
|---|---|---|---|
| **Kosovo** | A shape without an ISO code | Its own country, `XK` | Thor, 2026-11-16 (ADR 0019) |
| **Taiwan** | Its own shape | Its own country, `TW` | Thor, 2026-11-16 (ADR 0019) |
| **Somaliland** | A shape without an ISO code | Part of Somalia | The spec (mvp.md §2) |
| **Crimea** | Part of Russia | Part of Ukraine, the UN General Assembly's position | Thor, 2026-11-16 |
| **Western Sahara** | Everything west of the sand wall is part of Morocco; only the strip east of it is a separate shape | Its own country, `EH`, in one piece. Morocco ends at its border, the parallel 27°40′ N | Thor: separate from Morocco on 2026-11-16, a country in the list on 2026-11-17 (ADR 0019) |
| **Åland** | A separate shape | Part of Finland | Thor, 2026-11-16 |
| **Baikonur** (only in the finest data) | A separate shape cut out of Kazakhstan: the cosmodrome Russia leases | Part of Kazakhstan | The agent, 2026-11-17, under Thor's rule for undisputed territory: Kazakhstan's sovereignty over it isn't contested. For Thor to confirm |
| **France's overseas departments** (French Guiana, Guadeloupe, Martinique, Réunion, Mayotte) | Part of France's shape | Neutral | Thor, 2026-11-16. The spec asks for French Guiana; the other four are the same kind of place |
| **The Caribbean Netherlands** (Bonaire, Sint Eustatius, Saba) | Part of the Netherlands' shape | Neutral | Proposed by the agent by analogy with France's; confirmed by Thor, 2026-11-16 |

### Drawn as the source data has them
Each of these is a position too, and each is open to change. None was chosen by us: Thor's instruction is that anything not decided stays as the data has it and is listed here.

| Area | How it is drawn |
|---|---|
| **Golan Heights** | Part of Israel |
| **Palestine** | The West Bank, East Jerusalem included, and Gaza |
| **Northern Cyprus** | Neutral, so Cyprus is drawn without its northern third |
| **Kashmir** | Along the line of control: India, Pakistan and China each have what they hold. The Siachen Glacier is neutral |
| **Aksai Chin / Arunachal Pradesh** | China / India |
| **Abkhazia, South Ossetia** | Part of Georgia |
| **Transnistria** | Part of Moldova |
| **Nagorno-Karabakh** | Part of Azerbaijan |
| **Donetsk, Luhansk and the other occupied parts of Ukraine** | Part of Ukraine |
| **Hala'ib triangle / Bir Tawil** | Egypt / Sudan |
| **Ilemi triangle** | Kenya |
| **Abyei** | Sudan |
| **Kuril Islands** | Russia |
| **Greenland, the Faroe Islands, Puerto Rico, the Falkland Islands, New Caledonia** and every other territory with a shape of its own | Neutral (mvp.md §2) |
| **Alaska, Hawaii, Svalbard, the Canary Islands, the Azores, Galápagos** and other distant parts that are fully part of their country | Part of the country |
| **Only in the finest data:** Guantanamo Bay (the US base in Cuba), the British bases on Cyprus (Akrotiri, Dhekelia), the UN buffer zone on Cyprus | Separate shapes that aren't in our list, so they are not part of Cuba's or Cyprus's fine shape. Seen close up, those countries have small gaps there |
| **Only in the finest data:** the Spratly Islands, Scarborough Reef, and other uninhabited reefs and islets | Not drawn at the fine level, which has no neutral land |

### Open questions for Thor

| Area | Today | The question |
|---|---|---|
| **Hong Kong, Macao** | Neutral: the data has them as separate shapes that aren't in our list | Merge them into China, as Åland is merged into Finland? Thor left this undecided on 2026-11-16 |
| **The final rule for territories with their own shape** | Neutral, except Åland | Åland was merged because it is fully part of Finland. Greenland and the Faroe Islands (Denmark) and others are arguably the same kind of place. No other merge has been made |

### Label points
Not borders, but hand-set, so recorded: a country's label point is the middle of its largest piece of land (moved inside the country when the shape is bent). Two are set by hand:
- **Russia:** in European Russia, east of Moscow. Its geographic middle is in Siberia, and Russia belongs to Europe (M49).
- **Kiribati:** on Tarawa, the capital. Its largest island, Kiritimati, is 3,000 km away.

### Geometry
- **The files are GeoJSON that MapLibre draws as it is** (ADR 0021): longitude and latitude, with no projection applied. The projection (Equal Earth for now) belongs to the map component.
- **Three levels of detail,** all generated and **committed** in `app/features/maps/geometry/`:
  - `world.json`: every country in the list, coarse (from the 110m data, coordinates to 0.1°). Every visit loads it.
  - one file per continent: only that continent's countries (M49), detailed (from the 50m data, simplified, coordinates to 0.01°). Loaded when zooming in on the continent.
  - `countries/<ISO>.json`, one file per country: only that country, fine (from the 10m data, lightly simplified, coordinates to 0.001°, about 100 m). Loaded when zooming in close to the country. Thor asked for this level on 2026-11-17: the 50m data has about 300 points for all of Denmark, the 10m data about 2,200.
- **Every country is in exactly one continent file.** All detailed files are cut from one set of shapes simplified once, so a border is identical in the files on both sides of it. Russia is whole in the Europe file.
- **`pnpm maps:check`,** part of `pnpm check`, fails when the committed files differ from a fresh build. A change to a border therefore always shows up as a diff in a PR.
- **The map's edge is 169° W,** in the Bering Strait, not 180°. Shapes are cut there, and longitudes run from -169 to 191. Russia and Oceania stay in one piece, in every projection. The cost: two Alaskan islands (St. Lawrence and Umnak) are cut in two.
- **Each country carries** its ISO code, its label point (the same in every file), and a `marker` flag.
- **Markers** follow a plain rule: a country gets one when it has no shape in the file, or when its largest piece of land is under 5,000 km² (15,000 km² in the world file).
- **Neutral land** is one feature per continent, in the world file too, so the map can swap a continent's coarse land for its detailed land in one go. A piece of neutral land belongs to the continent of the nearest country.
- **Budgets,** gzipped: 60 KB for the world file and 100 KB for each continent file (Thor, 2026-11-16), and 250 KB for a country file (the agent's number, for Thor to confirm). The build fails over them. Today: world 40 KB; continents 18 to 83 KB; countries 1.8 MB in all, most of them a few KB, the largest Canada (241 KB), Russia (142 KB) and the United States (126 KB).
- **The fine level has no neutral land.** Greenland and the like stay at the continent's level of detail.
- **The very smallest countries keep the source's shape as it is,** because simplifying removes them. The Vatican's fine shape comes from the 50m data: the 10m file has it squashed flat.

## Alternatives considered
- **Building the files in CI instead of committing them:** a cleaner repo, but a border could change with no visible diff (when the data package is updated, for example), and every build would have one more step that can fail.
- **Drawing every disputed area as neutral:** looks even-handed, but a grey Crimea or a grey Kashmir is a position too, and it leaves holes in countries people write about.
- **Natural Earth's own files,** with their point-of-view variants: newer and more flexible, but needs a shapefile parser and a topology builder. The likely route when borders are revisited.
- **The finest data in the continent files, instead of a file per country:** simpler, but Europe alone would be several hundred KB, downloaded to look at one country.
- **A stricter size limit for country files:** bringing Canada under 150 KB means simplifying every country more, since one setting is used for all so that shared borders stay identical.
- **Neighbouring countries repeated in each continent's file:** the first version of this PR did that, because each file was simplified differently. With one simplification for all, it isn't needed.
- **A compact format of our own instead of GeoJSON:** about half the size, but needs decoding code in the browser. Not worth it at today's sizes.
- **A Greenwich-centred map, cut at 180°:** the familiar convention, but it splits Russia's far east.

## Consequences
- **Every map takes positions that some readers will object to,** and some countries regulate how their borders may be shown (India and China among them). This is the same exposure as ADR 0019, and it grows when sign-up opens.
- **A change in the source data can't move a border unnoticed.** The tests pin every row of the tables above to a place on the ground, and the build stops if Crimea or Western Sahara is no longer where the script expects it.
- **Western Sahara's border is our own cut,** not the source data's. It follows the parallel exactly, which the real border also does.
- **The world file has no shape for about 30 small states** (the 110m data lacks them). They are markers there, and shapes in their continent's file. Only the Vatican and Tuvalu have no shape anywhere.
- **The repo carries about 6 MB of generated country files,** and a change to the build script can rewrite all of them.
- **City-level zoom needs more than this.** Even the finest country outlines are for looking at a country, not a city. Streets and city detail need map tiles, which is a separate decision (ADR 0021).
- **Where a fine shape meets a coarser one,** the two don't line up exactly: a fine country next to a neighbour whose fine file hasn't arrived yet, or next to neutral land.
- **Longitudes above 180** are unusual. MapLibre handles them (tried in Equal Earth, Mercator and the globe); any other tool reading these files must expect them.

## Likely later directions (not built)
- **A map per owner's point of view.** Thor expects that the map will later be drawn according to where the map's owner is. That means several sets of border choices, and probably Natural Earth's point-of-view data.
- **Tiles for an advanced map** (ADR 0021) would bring their own borders, drawn by whoever makes the tiles. They would have to be reconciled with this ADR.

## When to revisit
Thor hasn't set a date. Together with ADR 0019:
- before sign-up opens to people who aren't invited;
- when the open questions above are answered;
- if a complaint, a legal question or a restriction in some market comes up;
- when the per-owner map is planned, or tiles are added.
