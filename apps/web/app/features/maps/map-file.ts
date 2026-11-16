// The format of the generated map files in ./geometry (scripts/build-maps.ts, ADR 0020).
//
// Every file uses the same coordinate space, so a continent file is the world
// map with more detail: its shapes can replace the world's without anything moving.

export type MapCountry = {
	/**
	 * SVG path data, in relative commands. Missing when the country is too small
	 * to have a shape in this file.
	 */
	d?: string;
	/** Where a label or a marker dot goes. The same point in every file. */
	at: [x: number, y: number];
	/** Too small to click at this file's scale (or it has no shape): draw a marker dot. */
	marker?: true;
	/** Belongs to another continent, and is here because it reaches into this file's frame. */
	neighbour?: true;
};

export type MapFile = {
	/** The size of the coordinate space: the whole world, the same in every file. */
	width: number;
	height: number;
	/** The part of the coordinate space this view shows: x, y, width, height. */
	frame: [x: number, y: number, width: number, height: number];
	/** By ISO alpha-2 code, in alphabetical order. */
	countries: Record<string, MapCountry>;
	/** Land that isn't a country in our list: one path, never clickable. */
	neutral: string;
};
