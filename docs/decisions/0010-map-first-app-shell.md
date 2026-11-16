# 0010: A map-first app shell

- **Status:** accepted; **the map engine is superseded by ADR 0021** (MapLibre replaces "our own SVG map, no map library", hand-written pan and zoom, and the server-rendered SVG). The shell, the URL-driven views and the navigation stand.
- **Date:** 2026-11-15

## Context
The first design sketches were a traditional website: a header, then a page with a map on it. Thor wants a web app instead, where the map is always the base, the way Google Maps keeps its map in the background with panels on top. The design canvas is linked from `docs/design/README.md`.

## Decision
- **One persistent shell.** A layout route renders `<CountryMap>` full-screen and keeps it mounted across navigation. Child routes render **only the floating panel** on top of it.
- **The URL drives the map.** Each route tells the shell what to show:
  - `/u/:username`: the world
  - `/u/:username/:continent`: that continent
  - `/u/:username/country/:iso`: that country, selected
  - `/write/:iso`: that country, with the editor panel
  The map moves between views with a short animation, or jumps instantly when the user prefers reduced motion.
- **Navigation is the map.** There is no "Write" page or tab:
  - The **owner** clicks any country: if it has no published essay, the editor opens; if it has one, the essay opens with an **Edit** button.
  - **Visitors** click written countries to read the essay. Unwritten countries are not links.
  - Continent chips over the map (World, Africa, Europe…) switch views.
  - The owner's drafts are listed under "In progress" in the profile panel.
- **Our own SVG map, no map library.** Equal Earth projection, Natural Earth geometry from `scripts/build-maps.ts`, pan and zoom implemented in `features/maps`. The world geometry loads on every page (a hashed, long-cached static asset). More detailed continent geometry loads when zooming in.
- **Layout:** on wide screens the panel floats on the left; the editor uses a wider panel and the map stays visible beside it. On phones the panel becomes a bottom sheet over the map.
- **Accessibility:** the panel is the page's `<main>` and comes first in the reading and focus order. The map is a labelled navigation region whose countries are links. Map controls (zoom, continent chips) are real buttons and links.
- **Privacy is unchanged (ADR 0003).** The geometry is static and cacheable. Which countries are written, and the names in the panels, are viewer-dependent data that goes through `access.server.ts` and is never shared-cached.

## Alternatives considered
- **A traditional page layout** (the first sketches): simpler, but the map becomes decoration instead of the way you use the app.
- **MapLibre GL or Leaflet:** built for tiled street maps, and far heavier (hundreds of KB of JavaScript), which would break the JavaScript budget (ADR 0013). We only need ~200 country shapes.
- **A small zoom helper library such as `d3-zoom`:** possible if hand-written pan and zoom turns out fiddly. Decided in the maps milestone's plan, with an ADR entry if added.

## Consequences
- **The map's code and geometry count towards every page's budget,** including reading pages. Pan and zoom must stay small.
- **The maps milestone (M1) grows:** pan, zoom, the URL-driven views and the shell are now core, not polish.
- **Bottom sheets on phones** need a component in `@thorbde/ui`. We'll check what Base UI offers before building one.
- **Server rendering still matters:** the panel's content and the map's SVG render on the server, so pages are readable before JavaScript loads.
