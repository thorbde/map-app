import { describe, expect, it } from "vitest";
import { type Continent, continents, countries } from "./countries";
import { continentPanel, countryPanel, worldPanel } from "./panels.server";

const continentIds = Object.keys(continents) as Continent[];

describe("the panels' data", () => {
	it("lists the six continents on the world panel, with counts that add up to 200", () => {
		const world = worldPanel();
		expect(world.countryCount).toBe(200);
		expect(world.continents.map(({ id }) => id)).toEqual(continentIds);
		expect(
			world.continents.reduce((sum, each) => sum + each.countryCount, 0),
		).toBe(200);
		expect(world.continents[0]).toEqual({
			id: "africa",
			name: "Africa",
			countryCount: 55,
		});
	});

	it("covers all 200 countries with the regions on the continent pages, each country once", () => {
		const listed = continentIds.flatMap((id) =>
			continentPanel(id).regions.flatMap((region) =>
				region.countries.map((country) => country.iso),
			),
		);
		expect(listed).toHaveLength(200);
		expect([...listed].sort()).toEqual(
			countries.map((country) => country.iso).sort(),
		);
	});

	it("lists only a continent's own countries on its page, and counts them", () => {
		for (const id of continentIds) {
			const panel = continentPanel(id);
			const listed = panel.regions.flatMap((region) => region.countries);
			expect(panel.countryCount, id).toBe(listed.length);
			expect(panel.regions.length, id).toBeGreaterThan(0);
			for (const { iso } of listed) {
				expect(
					countries.find((country) => country.iso === iso)?.continent,
					iso,
				).toBe(id);
			}
		}
		expect(continentPanel("africa").regions.map(({ name }) => name)).toEqual([
			"North Africa",
			"West Africa",
			"Central Africa",
			"East Africa",
			"Southern Africa",
		]);
	});

	it("builds a country's panel: where it is, its facts, and its neighbours by name", () => {
		const senegal = countryPanel("SN");
		expect(senegal.name).toBe("Senegal");
		expect(senegal.continent).toEqual({ id: "africa", name: "Africa" });
		expect(senegal.region).toEqual({ id: "west-africa", name: "West Africa" });
		expect(senegal.facts.map(({ label }) => label)).toEqual([
			"Capital",
			"Language",
			"Population",
			"Government",
		]);
		expect(senegal.neighbours.map(({ name }) => name)).toEqual([
			"Gambia",
			"Guinea",
			"Guinea-Bissau",
			"Mali",
			"Mauritania",
		]);
	});

	it("builds a panel for every country, with every neighbour a country in the list", () => {
		const isos = new Set(countries.map((country) => country.iso));
		for (const { iso } of countries) {
			for (const neighbour of countryPanel(iso).neighbours) {
				expect(isos.has(neighbour.iso), `${iso} → ${neighbour.iso}`).toBe(true);
			}
		}
	});
});
