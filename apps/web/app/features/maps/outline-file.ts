// The format of the generated outline files, ./geometry/outlines/*.json
// (scripts/build-maps.ts, ADR 0020): the small shapes on the panels' tiles.
//
// One file per continent holds its countries' outlines, and continents.json
// holds the six continents'. They are read on the server and arrive in the
// page's HTML (outlines.server.ts); they are never part of the JavaScript.

import type { Continent } from "../countries";

/** The side of the square box every outline is fitted to and centred in. */
export const OUTLINE_BOX = 100;

/**
 * An outline: the path data of an SVG `<path>` in a box 100 × 100
 * (`viewBox="0 0 100 100"`), as mapshaper writes it.
 */
type Outline = string;

/** A continent's file: each of its countries' outlines, by ISO code. */
export type CountryOutlines = Record<string, Outline>;

/** continents.json: each continent's outline. */
export type ContinentOutlines = Record<Continent, Outline>;

/**
 * Each outline file must stay under this, gzipped. The largest (Europe, 45
 * countries) is about 15 KB. Checked by the build, a test and `pnpm size`.
 */
export const OUTLINE_FILE_BUDGET_BYTES = 18_000;
