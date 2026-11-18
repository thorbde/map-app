// What an address may name (CLAUDE.md: validate with zod at every boundary).
import { z } from "zod";
import { type Continent, continents, countries } from "./countries";

const isos = new Set(countries.map((country) => country.iso));

/** A continent as it is written in an address: "north-america". */
export const continentSchema = z.enum(
	Object.keys(continents) as [Continent, ...Continent[]],
);

/** A country in scope, by its ISO code as the country list writes it: "SN". */
export const isoSchema = z.string().refine((iso) => isos.has(iso));
