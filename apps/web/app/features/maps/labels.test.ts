import { describe, expect, it } from "vitest";
import worldJson from "./geometry/world.json?raw";
import { LABEL_ZOOM_OFFSET, placesOf } from "./labels";
import type { MapCountryFeature, MapFile } from "./map-file";

const world = JSON.parse(worldJson) as MapFile;
const countries = world.features.filter(
	(feature): feature is MapCountryFeature => "iso" in feature.properties,
);

function place(iso: string, written: readonly string[] = []) {
	const { features } = placesOf(countries, { [iso]: "Its name" }, written);
	const found = features.find((each) => each.properties.iso === iso);
	if (!found) throw new Error(`No place for ${iso}`);
	return found;
}

describe("the names on the map", () => {
	it("has one name per country, at Natural Earth's label point", () => {
		expect(placesOf(countries, {}, []).features).toHaveLength(countries.length);
		const newZealand = countries.find((each) => each.properties.iso === "NZ");
		expect(place("NZ").geometry.coordinates).toEqual(
			newZealand?.properties.label,
		);
		expect(place("NZ").properties.name).toBe("Its name");
	});

	it("shows the prominent countries first and the smallest last, by Natural Earth's zooms", () => {
		const from = (iso: string) => place(iso).properties.showFrom;
		expect(from("RU")).toBeLessThan(from("DK"));
		expect(from("DK")).toBeLessThan(from("LU"));
		expect(from("LU")).toBeGreaterThanOrEqual(from("VA"));
		expect(from("DK")).toBe(3 + LABEL_ZOOM_OFFSET);
	});

	it("names a written country at every zoom", () => {
		expect(place("VA").properties.showFrom).toBeGreaterThan(0);
		expect(place("VA", ["VA"]).properties.showFrom).toBe(0);
		expect(place("VA", ["VA"]).properties.written).toBe(true);
	});

	it("puts every written country before every unwritten one where names collide", () => {
		const { features } = placesOf(countries, {}, ["VA", "EH"]);
		const ranks = (written: boolean) =>
			features
				.filter((each) => each.properties.written === written)
				.map((each) => each.properties.rank);
		expect(Math.max(...ranks(true))).toBeLessThan(Math.min(...ranks(false)));
	});

	it("lets the more prominent of two written countries stay", () => {
		const written = ["FR", "MC"];
		expect(place("FR", written).properties.rank).toBeLessThan(
			place("MC", written).properties.rank,
		);
	});
});
