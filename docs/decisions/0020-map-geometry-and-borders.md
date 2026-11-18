# 0020: Map geometry, and how borders are drawn

- **Status:** accepted
- **Date:** 2026-11-16
- **Risk:** **high** for every border choice. Thor wants them revisited (see "When to revisit").
- **Builds on:** ADR 0019 (Kosovo and Taiwan are countries in the list), ADR 0021 (MapLibre draws the map)

## Context
`scripts/build-maps.ts` turns Natural Earth's country shapes into the map the whole app stands on (M1 PR 3). A map can't avoid taking a position on contested areas. The source data mostly draws borders as they are controlled on the ground, which is not how every reader, or every country's law, expects them.

Thor's instruction (2026-11-16): **contested borders, areas and data are to be treated with great care, and every choice is recorded here, as a high-risk decision to revisit.** This ADR is the full record. A border choice that isn't in the tables below is a bug.

**Where the data comes from:** Natural Earth 5.1.2, a public-domain dataset, from its own files (Thor, 2026-11-17: "kill world-atlas and lean in to Natural Earth"). The script downloads them, pinned by version and by each file's SHA-256, and `mapshaper` does the geometry (ADR 0013). The first version of this ADR used the `world-atlas` package, which is built from Natural Earth 4.1.0 (2018) and strips out everything but shapes, names and numeric codes.

### What the source provides, and what we use

| File | What it provides | Used for |
|---|---|---|
| `ne_10m_admin_0_map_units` | Every country's shape, with overseas parts as pieces of their own | All the shapes. France's overseas departments and the Caribbean Netherlands are taken out by name |
| `ne_10m_admin_0_disputed_areas` | 99 disputed areas as shapes of their own | Crimea, and the part of Western Sahara that Morocco holds: each is cut out of the country the data draws it in and drawn as the country we say |
| `ne_10m_admin_0_countries` | Per country: a two-letter code (`ISO_A2_EH`: Kosovo `XK`, Taiwan `TW`, France and Norway included), a curated label point (`LABEL_X`, `LABEL_Y`), the zooms a label shows between (`MIN_LABEL`, `MAX_LABEL`) and its rank (`LABELRANK`) | The codes and the label fields, as they are |
| `ne_50m_admin_0_countries` | The same countries, coarser | The Vatican's shape only (see "Geometry") |

### What the source leaves out, or has differently from what we want
- **One point of view in these files.** Crimea is drawn as Russia, and most of Western Sahara as Morocco. We move both (below).
- **The Vatican is squashed** to a sliver 100 m across in the finest file.
- **Some label points are in the sea,** on purpose: for a country of islands, Natural Earth puts the name between them, as an atlas does. Antigua & Barbuda, Equatorial Guinea, New Zealand, São Tomé & Príncipe, Trinidad & Tobago, and St Vincent & the Grenadines. Thor accepted these on 2026-11-17.
- **Kiribati's label point is on Kiritimati,** 3,000 km east of the capital.
- **Five small territories carry their owner's country code** but are entries of their own: Clipperton Island (France), Ashmore and Cartier Islands, the Coral Sea Islands, Christmas Island and the Cocos Islands (Australia), and Brazilian Island (claimed by Brazil and Uruguay). The script lists them, so they stay neutral like every other territory. If the data ever files another territory under a country's code, the build stops.

### In the source, and not used yet
- **`FCLASS_SE`, `FCLASS_US` and 31 more fields, and ready-made files per point of view** (`ne_10m_admin_0_countries_swe` and so on): each area's status as seen from 33 countries. This is the data for the per-owner map (see "Likely later directions").
- **`ne_10m_admin_0_boundary_lines_land`:** borders as lines, marked international, disputed or line of control. With it, disputed borders can be dashed, as atlases and Google Maps do.
- **`ne_50m_admin_0_tiny_countries`:** 76 tiny countries as points. The source for marker dots, if they come back.
- **`WIKIDATAID`:** a Wikidata id per country, which could replace `scripts/wikidata-ids.ts`. Western Sahara's and Palestine's differ from ours.
- **Shapes for the breakaway states in ADR 0019** (Abkhazia, South Ossetia, Transnistria, Northern Cyprus, Somaliland), in the disputed-areas file. Drawing one as its own country is now a line in a table.

## Decision

### The rule
**Draw what the source data has, except for the choices in the first table.** Everything that isn't one of the countries in the list (ADR 0019) is **neutral land:** not clickable, and never coloured.

**How to change a border:** edit the tables at the top of `scripts/build-maps.ts`, update the table here, and add or change the matching test in `app/features/maps/geometry.test.ts`. Every row below has a test that checks a real place on the ground.

### Choices that differ from the source data

| Area | The source data | We draw | Decided by |
|---|---|---|---|
| **Kosovo** | Its own shape, with the code `XK` | Its own country, `XK` | Thor, 2026-11-16 (ADR 0019) |
| **Taiwan** | Its own shape | Its own country, `TW` | Thor, 2026-11-16 (ADR 0019) |
| **Somaliland** | Its own shape, without a code | Part of Somalia | The spec (mvp.md §2) |
| **Crimea** | Part of Russia, and a shape in the disputed-areas file | Part of Ukraine, the UN General Assembly's position: that shape is moved from Russia to Ukraine | Thor, 2026-11-16 |
| **Western Sahara** | Everything west of the sand wall is part of Morocco; only the strip east of it is Western Sahara. The part Morocco holds is also a shape in the disputed-areas file | Its own country, `EH`, in one piece: that shape is moved from Morocco to Western Sahara. Morocco ends at Natural Earth's line, which runs within about 600 m of the parallel 27°40′ N | Thor: separate from Morocco on 2026-11-16, a country in the list on 2026-11-17 (ADR 0019), Natural Earth's line instead of our own cut on 2026-11-17 |
| **Åland** | A separate shape | Part of Finland | Thor, 2026-11-16 |
| **Baikonur** | A separate shape cut out of Kazakhstan: the cosmodrome Russia leases. The data gives it Kazakhstan's code | Part of Kazakhstan | The agent, 2026-11-17, under Thor's rule for undisputed territory: Kazakhstan's sovereignty over it isn't contested. For Thor to confirm |
| **France's overseas departments** (French Guiana, Guadeloupe, Martinique, Réunion, Mayotte) | Part of France, each a map unit of its own | Neutral | Thor, 2026-11-16. The spec asks for French Guiana; the other four are the same kind of place |
| **The Caribbean Netherlands** (Bonaire, Sint Eustatius, Saba) | Part of the Netherlands, as one map unit of its own | Neutral | Proposed by the agent by analogy with France's; confirmed by Thor, 2026-11-16 |

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
| **Hala'ib triangle** | Egypt |
| **Bir Tawil** | Neutral |
| **The Southern Patagonian Ice Field** | Neutral |
| **Ilemi triangle** | Kenya |
| **Abyei** | Sudan |
| **Kuril Islands** | Russia |
| **Greenland, the Faroe Islands, Puerto Rico, the Falkland Islands, New Caledonia** and every other territory with a shape of its own | Neutral (mvp.md §2) |
| **Alaska, Hawaii, Svalbard, the Canary Islands, the Azores, Galápagos** and other distant parts that are fully part of their country | Part of the country |
| **Guantanamo Bay** (the US base in Cuba), **the British bases on Cyprus** (Akrotiri, Dhekelia), **the UN buffer zone on Cyprus** | Neutral: separate shapes in the source data that aren't in our list. Seen close up, Cuba and Cyprus have small neutral patches there |
| **The Spratly Islands, Scarborough Reef,** and other uninhabited reefs and islets | Neutral |
| **The Paracel Islands** | China: the data files them under China. Vietnam and Taiwan claim them |
| **Clipperton Island, Ashmore and Cartier Islands, the Coral Sea Islands, Christmas Island, the Cocos Islands, Brazilian Island** | Neutral, although the data gives them their owner's code (see "What the source leaves out") |
| **The Cook Islands, Niue** | Countries in the list (ADR 0019), each with its own shape |

### What moved when the source changed (2026-11-17)
The old and new files were compared at 830,000 points, a quarter of a degree apart. Of the 246,000 on land, 151 differ. Nearly all are single points on a coast or a border, where the newer data is drawn slightly differently. Four are changes in what the data says:

| Area | Under `world-atlas` (2018 data) | Under Natural Earth 5.1.2 |
|---|---|---|
| **Western Sahara's northern border** | Our own cut along 27°40′ N | Natural Earth's line, about 600 m south (Thor, 2026-11-17) |
| **Bir Tawil** | Part of Sudan | Neutral: the data now has it as an entry of its own, claimed by neither Egypt nor Sudan |
| **The Southern Patagonian Ice Field** | Part of Argentina | Neutral: the data now has it as an entry of its own, a stretch of the border Chile and Argentina haven't settled. A neutral patch between the two |
| **The India–China line in Arunachal Pradesh** | | Drawn a little further south at three of the compared points. The place the test pins (94.5° E, 28° N) is still India |

Every place the tests pinned before is in the same country now. Hong Kong, Macao and the breakaway states are drawn exactly as before: the agent's choice, under Thor's rule that contested territory doesn't hold the work up, to change the source and not the positions in one step. Bir Tawil and the ice field follow the rule "draw what the source data has"; both are for Thor to revisit with the rest.

### Open questions for Thor

| Area | Today | The question |
|---|---|---|
| **Hong Kong, Macao** | Neutral: the data has them as separate shapes that aren't in our list | Merge them into China, as Åland is merged into Finland? Thor left this undecided on 2026-11-16 |
| **The final rule for territories with their own shape** | Neutral, except Åland | Åland was merged because it is fully part of Finland. Greenland and the Faroe Islands (Denmark) and others are arguably the same kind of place. No other merge has been made |

### Labels
Not borders, but recorded, because they decide what a viewer reads first.
- **Each country's label point, label zooms and rank are Natural Earth's,** copied as they are (`label`, `labelMinZoom`, `labelMaxZoom`, `labelRank` in the file). Big countries are named first: Russia and Brazil from zoom 1.7, Denmark from 3, Luxembourg from 5.7. The zooms are tuned for ordinary web maps and may need one overall offset in Equal Earth; that is the map component's to decide.
- **Russia's point is in European Russia,** in the data itself. It used to be set by hand.
- **Seven label points are not on their country's land:** the six in the sea listed above, and the Vatican's, which is where the Vatican is while its shape is drawn 1.3 km to the west (see "Geometry"). The test allows these seven by name, each within 150 km of its country's land.
- **One point is set by hand: Kiribati's, on Tarawa,** the capital (Thor, 2026-11-17). Natural Earth's is on Kiritimati, which lies beyond the map's edge and so sits alone at the far left.
- **No marker dots and no sizes** (Thor, 2026-11-17). The file used to carry each country's size for a marker-dot rule; rank replaces it.

### The Pacific edge
- **The Cook Islands are on the far left of the map,** next to Hawaii, not with the rest of Oceania: they lie east of the map's edge (Thor, 2026-11-17: leave them where they truly are). So do Kiribati's eastern islands, which splits Kiribati across the two sides. Niue is just west of the edge, on the right. On the globe and on Mercator this doesn't arise. **The Oceania view therefore runs from Australia to Niue and leaves the Cook Islands out:** they are reached by panning or from the country list, the one country outside its continent's view (Thor, 2026-11-17; `views.ts`, and a test that fails if a second one appears). To be looked at again when the projection is settled.

### Geometry
- **One file, `app/features/maps/geometry/world.json`:** every country in the list and the neutral land, at one level of detail. It is GeoJSON that MapLibre draws as it is (ADR 0021): longitude and latitude, with no projection applied.
- **MapLibre does the simplifying.** Given detailed shapes, it draws a suitably simplified version at each zoom level by itself. So there is one set of shapes, and nothing to swap as the viewer zooms: coastlines, borders and fills always match, and neighbours always line up.
  - **Thor's decision, 2026-11-17,** after trying a version with three levels of detail that loaded as the viewer zoomed in. Its swaps showed: for a moment the finer coastline and the coarser land didn't match. His rule: accept that the map takes a couple of seconds to load, lean on what the libraries already do, and make it good once it is loaded.
- **The source is Natural Earth's finest data** (1:10 million), lightly simplified by mapshaper, with coordinates to 0.001° (about 100 m). Denmark has about 1,600 points, the same detail as before the source changed. Good for looking at a country; not for looking at a city (ADR 0021).
- **The file is generated and committed.** `pnpm maps:check`, part of `pnpm check`, fails when it differs from a fresh build. A change to a border therefore always shows up as a diff in a PR.
- **The map's edge is 169° W,** in the Bering Strait, not 180°. Shapes are cut there, and longitudes run from -169 to 191. Russia and Oceania stay in one piece, in every projection. The cost: a few Alaskan islands (St. Lawrence and Umnak among them) are cut in two.
- **Each country carries** its ISO code, its label point, its label zooms and its rank (see "Labels").
- **No country or island is simplified away:** mapshaper keeps every shape.
- **The Vatican's shape comes from the coarser 50m file,** as before: the finest file has it squashed to a sliver. The coarser shape is a rough hexagon a kilometre across, drawn 1.3 km west of where the Vatican is. It is cut out of Italy, so the two don't overlap.
- **Budget:** 2.5 MB gzipped (confirmed by Thor, 2026-11-17). The build fails over it. Today: 1.98 MB gzipped, 6.6 MB on disk.

### The outlines on the panels' tiles (2026-11-18)

The world panel shows the six continents, and a continent panel its countries, each as a small outline of itself (Thor, 2026-11-18).

- **The outlines are one more output of the same build,** from the same shapes: every border choice above is in them, and none is made twice. Crimea is in Ukraine's outline, Somaliland in Somalia's, Western Sahara has its own. **Risk: high, as for the map.**
- **mapshaper does the work:** it projects each shape to Equal Earth (the map's projection, same centre), simplifies it for a drawing 100 px across, fits and centres it in a box 100 × 100, and writes the SVG path. Ours is only which land goes in.
- **Which land goes in is the map's own views, not a new rule.** A country is the land its country view frames (`countryBounds` in `views.ts`): the piece of land its name is on, or, for the eight names beside or between their land, the land within 150 km. A continent is its countries merged, inside its continent view's box (`CONTINENT_BOUNDS`). `outline-land.ts` holds both so that the build script can read them, and a test fails if they and `views.ts` differ.
- **What that leaves out, on purpose and to be judged by Thor in Storybook** (`Proposals/Outlines`, "Hard cases"): islands and parts away from the named land. The United States is shown without Alaska and Hawaii, Norway without Svalbard, Portugal without the Azores; but also Indonesia as Sumatra alone, Denmark as Jutland, Italy without Sicily and Sardinia, the United Kingdom without Northern Ireland, Japan as Honshu. **Northern Ireland's absence is a side effect of the rule and not a position; risk: high.** With all the land instead, 25 or so countries become specks in their box (Norway, Portugal, the United States, the Seychelles).
- **Europe's outline ends at 50° E,** with a straight edge through Russia, as its view does. French Guiana is not in South America's (it is neutral land).
- **Kiribati is faint:** eight thin atolls over 400 km, four of them too small to draw at this size. Less simplification, another simplification method and finer coordinates were tried in mapshaper; none changes it, because the atolls themselves are slivers.
- **Seven files, generated and committed,** in `app/features/maps/geometry/outlines/`: one per continent (its countries by ISO code) and `continents.json`. `pnpm maps:check` covers them. Coordinates are whole numbers.
- **Budget: 18 KB gzipped per file.** The build, a test and `pnpm size` check it. Today the largest is Europe: 14.9 KB gzipped, 42 KB on disk. All seven together are 58 KB gzipped.
- **They are read on the server** (`outlines.server.ts`) and arrive in the panel's HTML. They are never part of the page's JavaScript.
- **Why not Natural Earth's small-scale files** (1:110 million), which are already this coarse: they leave out the smallest countries, and none of our border choices are in them.

## Alternatives considered
- **Building the files in CI instead of committing them:** a cleaner repo, but a border could change with no visible diff (when the data package is updated, for example), and every build would have one more step that can fail.
- **Drawing every disputed area as neutral:** looks even-handed, but a grey Crimea or a grey Kashmir is a position too, and it leaves holes in countries people write about.
- **The `world-atlas` package** (the first version): small and ready to use, but built from 2018 data, and it strips the codes, label points, ranks and points of view that Natural Earth ships. Everything it left out we had rebuilt by hand: a table of numeric codes, computed label points, boxes to find Crimea and the overseas parts, our own cut for Western Sahara.
- **Our own straight cut for Western Sahara's border,** along the parallel 27°40′ N: what the first version did. Natural Earth's line is the surveyed one and needs no code of ours.
- **Moving the six label points in the sea onto land:** every label on its own country, but six hand-set points to maintain, against how atlases label island countries.
- **Drawing the Cook Islands past the right-hand edge,** with the rest of Oceania: reads better on a flat map, but the map would be wider than the world, which the map component would have to support.
- **Three levels of detail, loaded as the viewer zooms in** (a coarse world, a file per continent, a file per country): built and tried first. The first load was tiny (40 KB of map data), but every swap was a moment where coastline and land could mismatch, and it was a lot of code doing by hand what MapLibre does itself.
- **Map tiles of our own shapes:** what tiles are for, loading only what is in view, but it needs a tile-building step, and MapLibre doesn't reproject tiles into Equal Earth (ADR 0021).
- **A compact format of our own instead of GeoJSON:** about half the size, but needs decoding code in the browser. Not worth it at today's sizes.
- **A Greenwich-centred map, cut at 180°:** the familiar convention, but it splits Russia's far east.

## Consequences
- **Every map takes positions that some readers will object to,** and some countries regulate how their borders may be shown (India and China among them). This is the same exposure as ADR 0019, and it grows when sign-up opens.
- **A change in the source data can't move a border unnoticed.** The source is pinned by version and checksum, the tests pin every row of the tables above to a place on the ground, and the build stops if a shape or a code the script relies on is no longer there.
- **`pnpm check` needs the source files:** about 30 MB, downloaded once into `apps/web/.cache/`. With no cache and no network, the check fails. Behind a proxy, run it with `NODE_USE_ENV_PROXY=1`.
- **The edge of the map relies on a mapshaper command, `-rotate`, that isn't in its documentation.** A known soft spot, accepted by Thor on 2026-11-17. The fallback is `d3-geo` for that one step (ADR 0013).
- **Every visit downloads about 2 MB of map data,** once (it is cached), on top of the map engine. The map takes a couple of seconds to appear on a normal connection, and longer on a slow one. Phones are expected to use an app with the map files bundled in (Thor, 2026-11-17).
- **The repo carries a 6.6 MB generated file,** which a change to the build script rewrites.
- **City-level zoom needs more than this.** Streets and city detail need map tiles, which is a separate decision (ADR 0021).
- **Longitudes above 180** are unusual. MapLibre handles them (tried in Equal Earth, Mercator and the globe); any other tool reading these files must expect them.

## Likely later directions (not built)
- **A map per owner's point of view.** Thor expects that the map will later be drawn according to where the map's owner is. That means several sets of border choices. Natural Earth ships the data for 33 points of view (see "In the source, and not used yet").
- **Dashed disputed borders,** from Natural Earth's boundary-lines file.
- **Tiles for an advanced map** (ADR 0021) would bring their own borders, drawn by whoever makes the tiles. They would have to be reconciled with this ADR.

## When to revisit
Thor hasn't set a date. Together with ADR 0019:
- before sign-up opens to people who aren't invited;
- when the open questions above are answered;
- if a complaint, a legal question or a restriction in some market comes up;
- when the per-owner map is planned, or tiles are added.
