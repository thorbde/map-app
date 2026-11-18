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

## As built in M1 PR 5 (2026-11-18)

- **Temporary addresses.** Until profiles arrive (M4) the shell lives at `/preview` (the world), `/preview/:continent` and `/preview/country/:iso`, with everyone counted as the owner and nothing written (`docs/specs/m1.md`, question 1). An address that names no continent or country in the list is a 404. ISO codes are written as the country list writes them (`SN`, not `sn`).
- **Who says what the map shows.** Each child route's loader checks its address (zod) and returns the panel's data and the map view. The layout route reads the view from the deepest matching route (React Router's `useMatches`) and hands it to `<CountryMap>`, which is never unmounted.
- **The camera keeps clear of what floats over the map** with MapLibre's own `padding`: the panel's width (the `size.panel` token) and the gap beside it on the left, the row of chips at the top. The map component takes them as CSS lengths and measures them when the camera moves. The bounds are fitted to what is left by `cameraFor`, which exists because MapLibre's own fitting only looks at a box's corners (wrong in Equal Earth).
- **Focus after a link: our own, about ten lines** in the layout route. React Router moves no focus on a client-side navigation, and has no option for it, so after the address changes the layout focuses the new panel's `h1` (`tabindex="-1"`). A screen reader then reads the new heading, and Tab carries on into the panel. Two cases are left alone: the first page load (the browser starts at the top), and a country opened from the map (focus stays on the map, for the keyboard use that comes in M1 PR 6). What established products do: GitHub and GOV.UK's single-page flows focus the new page's heading or main region in the same way.
- **The chip of a country's continent is the current one** on that country's page.

## Alternatives considered
- **A traditional page layout** (the first sketches): simpler, but the map becomes decoration instead of the way you use the app.
- **MapLibre GL or Leaflet:** built for tiled street maps, and far heavier (hundreds of KB of JavaScript), which would break the JavaScript budget (ADR 0013). We only need ~200 country shapes.
- **A small zoom helper library such as `d3-zoom`:** possible if hand-written pan and zoom turns out fiddly. Decided in the maps milestone's plan, with an ADR entry if added.

## Consequences
- **The map's code and geometry count towards every page's budget,** including reading pages. Pan and zoom must stay small.
- **The maps milestone (M1) grows:** pan, zoom, the URL-driven views and the shell are now core, not polish.
- **Bottom sheets on phones** need a component in `@thorbde/ui`. We'll check what Base UI offers before building one.
- **Server rendering still matters:** the panel's content and the map's SVG render on the server, so pages are readable before JavaScript loads.
