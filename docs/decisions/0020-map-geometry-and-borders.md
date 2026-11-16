# 0020: Map geometry: one coordinate space, and how borders are drawn

- **Status:** accepted
- **Date:** 2026-11-16
- **Risk:** **high** for the border choices. Thor wants them revisited (see "When to revisit").
- **Builds on:** ADR 0010 (our own SVG map, Equal Earth), ADR 0019 (Kosovo and Taiwan are countries in the list)

## Context
`scripts/build-maps.ts` turns Natural Earth's country shapes into the map the whole app stands on (M1 PR 3). Two kinds of decision had to be made:

- **Technical:** the file format, where the files live, and how the world map and the more detailed continent maps fit together.
- **Borders:** a map can't avoid taking a position on contested areas. The source data (`world-atlas`, built from Natural Earth) mostly draws borders as they are controlled on the ground, which is not how every reader, or every country's law, expects them.

Thor's instruction (2026-11-16): contested borders, areas and data are to be treated with great care, and the choices recorded as a high-risk decision to revisit.

## Decision

### Geometry
- **One coordinate space.** Every file uses the same projection and the same coordinates (10,000 units wide, whole numbers). A continent file is the world map with more detail, so its shapes can replace the world's while zooming without anything moving.
- **Seven files,** generated and **committed** in `app/features/maps/geometry/`: `world.json` (from the 110m data) and one per continent (from the 50m data, simplified). `pnpm maps:check`, part of `pnpm check`, fails when the committed files differ from a fresh build. A change to a border therefore always shows up as a diff in a PR.
- **Each file holds** (`app/features/maps/map-file.ts`):
  - a shape per ISO code, as SVG path data;
  - a label point per country, the same in every file;
  - a `marker` flag for countries too small to click at that file's scale;
  - one merged path of neutral land;
  - the view's frame.
- **The projection is Equal Earth, turned 11° east,** so the map's edge runs through the Bering Strait (169° W) instead of 180°. Russia and Oceania stay in one piece. The cost: a few Alaskan islands (St. Lawrence among them) are split by the edge.
- **Continents follow M49** (ADR 0019, `countries.ts`). A continent file contains its own countries whole, plus every other country that reaches into its frame, flagged `neighbour`, so borders match inside the view.
  - **Russia** belongs to Europe. The Europe frame ends near the Urals; the rest of Russia is in the file and reachable by panning. Russia is also in the Asia file as a neighbour.
  - Russia's label point is in European Russia, not in its geographic middle in Siberia.
- **Markers** follow a generic rule: a country gets one when it has no shape in the file, or when its largest piece of land would be under about 8 px across in a continent view (3 px in the world view).
- **The budget** is 50 KB gzipped per file. The build fails over it. Today the files are 11 to 34 KB.

### Borders
The rule: **draw what the source data has, except for the choices listed here.** Everything that isn't one of the 197 countries is neutral land: not clickable, and never coloured.

Choices that differ from the source data:

| Area | The source data | We draw | Why |
|---|---|---|---|
| **Kosovo** | A shape without an ISO code | Its own country, `XK` | ADR 0019 |
| **Somaliland** | A shape without an ISO code | Part of Somalia | mvp.md §2 |
| **Crimea** | Part of Russia | Part of Ukraine | Thor, 2026-11-16. The UN General Assembly's position |
| **France's overseas departments** (French Guiana, Guadeloupe, Martinique, Réunion, Mayotte) | Part of France's shape | Neutral | mvp.md §2 asks for French Guiana; the other four are the same kind of place |
| **The Caribbean Netherlands** (Bonaire, Sint Eustatius, Saba) | Part of the Netherlands' shape | Neutral | The same reasoning as France's. **Chosen by the agent by analogy; Thor to confirm** |

Drawn as the source data has them. Each is a position, and each is open to change:

| Area | How it is drawn |
|---|---|
| **Western Sahara** | **Mostly as part of Morocco.** The data gives Morocco everything west of the sand wall, and only the strip east of it is a separate, neutral shape. This is not what mvp.md §2 expects ("Western Sahara is neutral"). **Open question for Thor** |
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
| **Taiwan** | Its own country (ADR 0019) |
| **Hong Kong, Macao** | Neutral: the data has them as separate shapes that aren't in our list |
| **Åland** | Neutral, for the same reason, though it is part of Finland. **Open question for Thor** |
| **Greenland, the Faroe Islands, Puerto Rico, the Falkland Islands, New Caledonia** and other territories with a shape of their own | Neutral (mvp.md §2) |
| **Alaska, Hawaii, Svalbard, the Canary Islands, the Azores, Galápagos** and other distant parts that are fully part of their country | Part of the country |

## Alternatives considered
- **Building the files in CI instead of committing them:** a cleaner repo, but a border could change with no visible diff (when the data package is updated, for example), and every build would have one more step that can fail.
- **A projection per continent,** each centred on its continent: better-looking continents, but the shapes would differ from the world map's, and zooming from the world into a continent couldn't be one smooth movement.
- **Only a continent's own countries in its file,** with the coarser world map showing through around them: smaller files, but borders between detailed and coarse neighbours don't meet, which shows as slivers.
- **A Greenwich-centred map:** the familiar look, but it splits Russia's far east and puts Samoa and Tonga on the opposite edge from the rest of Oceania.
- **Natural Earth's own files,** which include variants drawn from different countries' points of view: newer and more flexible, but needs a shapefile parser and a topology builder. Worth another look when borders are revisited.
- **Drawing every disputed area as neutral:** looks even-handed, but a grey Crimea or a grey Kashmir is a position too, and it leaves holes in countries people write about.

## Consequences
- **Every map takes positions that some readers will object to,** and some countries regulate how their borders may be shown (India and China among them). This is the same exposure as ADR 0019, and it grows when sign-up opens.
- **The border choices are a few lines** at the top of `scripts/build-maps.ts` (boxes for Crimea and the overseas parts, the rules for features without an ISO code). Changing one is a small PR with a visible diff.
- **Western Sahara can't be fixed with a rule like Crimea's,** because the data has no separate piece to move: it would need Morocco's shape cut along the 27°40′ N line, or different source data.
- **The world file has no shape for about 30 small states** (the 110m data lacks them). They are markers there, and shapes in their continent's file.
- **The files don't name their projection.** They are a coordinate space, a frame and paths, so nothing that reads them depends on Equal Earth.

## Likely later directions (not built)
- **A map per owner's point of view.** Thor expects that the map will later be drawn according to where the map's owner is. That would mean several sets of border choices, and probably Natural Earth's point-of-view data.
- **A projection setting** (Thor, 2026-11-16): Mercator as well as Equal Earth, and later a 3D globe. A second flat projection is another run of the same script producing a second set of files. A globe is a different technique (it needs coordinates on the sphere and drawing in the browser), and gets its own decision.

## When to revisit
Thor hasn't set a date. Together with ADR 0019:
- before sign-up opens to people who aren't invited;
- when the open questions above (Western Sahara, Åland, the Caribbean Netherlands) are answered;
- if a complaint, a legal question or a restriction in some market comes up;
- when the per-owner map is planned.
