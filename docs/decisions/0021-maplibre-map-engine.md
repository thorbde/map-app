# 0021: MapLibre is the map engine

- **Status:** accepted
- **Date:** 2026-11-16
- **Supersedes:** the map-engine parts of ADR 0010 ("our own SVG map, no map library", pan and zoom written by hand, the map's SVG rendered on the server). The rest of ADR 0010 stands: the persistent shell, the URL driving the map, navigation through the map, the panel layout, privacy.
- **Updates:** ADR 0013 (the JavaScript budget)

## Context
ADR 0010 chose a small hand-made SVG map, because MapLibre was "far heavier" than the JavaScript budget allowed and "we only need ~200 country shapes".

Thor's goals for the map have since grown (2026-11-16):
- **A 3D globe is a real goal,** not a nice-to-have.
- **An advanced map later,** with rich, animated features. "Schoolbook comes alive" needs more than the 150 KB budget leaves room for.
- **A projection setting** for users: Equal Earth, Mercator and the globe.

A hand-made SVG map can't become a globe, and every advanced feature would have to be built from nothing. M1's riskiest PR was hand-written pan and zoom inside about 40 KB.

A throwaway spike (2026-11-16) showed one MapLibre map drawing our own country shapes in Equal Earth, Mercator and the globe, switching between them at run time, and colouring written countries.

## Decision
- **MapLibre GL JS draws the map.** Version 6.18.0 today, pinned exactly.
- **Our own country shapes only: no tile service, no MapTiler, no API key.** The shapes still come from `scripts/build-maps.ts` (Natural Earth; border choices in ADR 0020). Nothing about a visitor leaves the site, and the list of external services in `ARCHITECTURE.md` stays as it is. Tiles can be added later, as a decision of their own, when a feature needs them.
- **Projections:**
  - **Equal Earth is the default for now.** Thor hasn't decided between Equal Earth and Mercator as the final default.
  - Mercator and the globe are options. The user-facing setting arrives with accounts and settings, not in M1.
  - MapLibre has Mercator and the globe built in. **Equal Earth is registered as a custom projection** with MapLibre's `addProjection`, which is marked experimental.
- **The size budget changes** (decided by Thor):
  - **MapLibre loads lazily, after the page, and is outside the first-load budget,** the way CodeMirror is. The 150 KB first-load budget stays for everything else: the panel, the essay text and navigation arrive first and work before the map engine does.
  - **The map engine gets a limit of its own,** set from what is measured when it is added (M1 PR 4), so it can't grow unnoticed. Measured today: 296 KB gzipped, plus a 147 KB worker file that loads in the background and 10 KB of CSS.
- **Before the map has loaded,** the page shows a plain ocean-coloured background. Nothing is drawn on the server.
- **Accessibility:** a canvas has no links in it, so **the panel carries the navigation:** every country the viewer may open is a real link in a list in the panel. The map remains a labelled region with keyboard pan and zoom, but it is never the only way to reach a country.
- **No attribution on the map.** Natural Earth is public domain, and MapLibre's licence (BSD 3-clause) asks only that its licence text stays with the code. The build must keep that notice. This changes if tiles are added: most tile data requires a visible credit.

## What the spike found
- **The shapes must be reloaded after a projection switch,** or they stay where the old projection put them. A switch is a redraw, not a smooth morph.
- **Shapes that cross the 180° line** (Russia's far east, Fiji) draw stray lines unless the build script cuts them at the map's edge. Not yet proven; the current script already makes this cut for its SVG output.
- **A custom projection's world is a square,** so Equal Earth has empty space above and below it that needs the ocean colour.
- **Our shapes need the projection described twice:** to the page, and to MapLibre's background worker.
- It ran in a headless browser with software graphics. Speed and smoothness on real devices are unmeasured.

## Alternatives considered
- **Stay with the hand-made SVG map** (ADR 0010): light, rendered on the server, countries are real links. No globe, and no path to the advanced map.
- **MapLibre with MapTiler tiles, through `react-map-gl`:** detail at every zoom and a ready-made base map, but every visitor's IP address goes to MapTiler, it needs a key and has usage limits, a credit is required on the map, and its borders are MapTiler's choices, not ours.
- **Mapbox GL JS:** has Equal Earth and the globe built in. Proprietary, paid beyond a free tier, sends visitor data to Mapbox, and requires its logo on the map.
- **The SVG map as the flat view, with MapLibre only for the globe:** real Equal Earth on the server, but two map implementations, and every map feature built twice or living in only one.
- **The globe as the default:** shows true sizes with no flat-map distortion, but only ever half the world. Thor wants a flat default.
- **Keeping MapLibre inside the 150 KB budget:** impossible; it is twice the whole budget.

## Consequences
- **The first visit downloads about 450 KB of map engine** after the page itself. On a slow phone connection the map can take a few seconds to appear, while the text is there at once. The file is fingerprinted and long-cached, changes only when we upgrade MapLibre, and the shell loads it once per visit.
- **The map is not in the server's HTML any more.** `mvp.md` §8's "the map's SVG is server-rendered" no longer holds; the panel's content still is.
- **WebGL is required to see the map.** Without it, the panel and its country list still work.
- **`addProjection` is experimental** and can change between MapLibre versions. Exact pinning means that only happens when we upgrade on purpose. If it is ever removed, the fallback is Mercator and the globe, or pre-projecting the shapes ourselves.
- **Equal Earth can only show our own shapes.** MapLibre doesn't reproject tiles into a custom projection, so a later tile-based map works on the globe and Mercator only.
- **M1 changes shape** (`docs/specs/m1.md`): pan, zoom and pinch come with MapLibre, so the riskiest PR shrinks. New risks take its place: labels in our fonts on a WebGL map, and e2e tests that need WebGL in CI.
- **`scripts/build-maps.ts` writes shapes as coordinates for MapLibre,** not SVG paths. Its country matching, border choices and tests carry over (M1 PR 3, reworked).
- **Map colours still come from tokens,** but MapLibre needs colour values, not CSS classes: the map component reads the token values at run time.
- **Decided in M1 PR 4's plan:** whether to use MapLibre directly or through the `react-map-gl` wrapper, and how labels are drawn.
