import type { CSSProperties, ReactNode } from "react";

// Real content for the stories of the map shell's pieces: the names are the
// country list's, the facts are Wikidata's as they stand in the app
// (2026-11-18). Copied here because the design system never imports from the
// app (ADR 0008). Stories only; nothing here ships.

export const continents = [
	{ name: "Africa", countries: 55 },
	{ name: "Asia", countries: 49 },
	{ name: "Europe", countries: 45 },
	{ name: "North America", countries: 23 },
	{ name: "Oceania", countries: 16 },
	{ name: "South America", countries: 12 },
];

export const chipNames = [
	"World",
	"Africa",
	"Europe",
	"Asia",
	"North America",
	"South America",
	"Oceania",
];

export const africa = [
	{
		region: "North Africa",
		countries: [
			"Algeria",
			"Egypt",
			"Libya",
			"Mauritania",
			"Morocco",
			"Tunisia",
			"Western Sahara",
		],
	},
	{
		region: "West Africa",
		countries: [
			"Benin",
			"Burkina Faso",
			"Cape Verde",
			"Côte d’Ivoire",
			"Gambia",
			"Ghana",
			"Guinea",
			"Guinea-Bissau",
			"Liberia",
			"Mali",
			"Niger",
			"Nigeria",
			"Senegal",
			"Sierra Leone",
			"Togo",
		],
	},
	{
		region: "Central Africa",
		countries: [
			"Burundi",
			"Cameroon",
			"Central African Republic",
			"Chad",
			"Congo - Brazzaville",
			"Congo - Kinshasa",
			"Equatorial Guinea",
			"Gabon",
			"São Tomé & Príncipe",
		],
	},
	{
		region: "East Africa",
		countries: [
			"Comoros",
			"Djibouti",
			"Eritrea",
			"Ethiopia",
			"Kenya",
			"Madagascar",
			"Mauritius",
			"Rwanda",
			"Seychelles",
			"Somalia",
			"South Sudan",
			"Sudan",
			"Tanzania",
			"Uganda",
		],
	},
	{
		region: "Southern Africa",
		countries: [
			"Angola",
			"Botswana",
			"Eswatini",
			"Lesotho",
			"Malawi",
			"Mozambique",
			"Namibia",
			"South Africa",
			"Zambia",
			"Zimbabwe",
		],
	},
];

export const senegal = {
	name: "Senegal",
	region: "West Africa",
	facts: [
		{ label: "Capital", value: "Dakar" },
		{ label: "Language", value: "French" },
		{ label: "Population", value: "16.9 million (2021)" },
		{ label: "Government", value: "Presidential system" },
	],
	neighbours: ["Gambia", "Guinea", "Guinea-Bissau", "Mali", "Mauritania"],
};

/** The country with the longest values: three capitals and twelve languages. */
export const southAfrica = {
	name: "South Africa",
	region: "Southern Africa",
	facts: [
		{ label: "Capitals", value: "Bloemfontein, Cape Town, Pretoria" },
		{
			label: "Languages",
			value:
				"Afrikaans, English, Northern Sotho, Sesotho, South African Sign Language, Southern Ndebele, Swazi, Tsonga, Tswana, Venda, Xhosa, Zulu",
		},
		{ label: "Population", value: "62.0 million (2022)" },
		{ label: "Government", value: "Parliamentary republic" },
	],
	neighbours: [
		"Botswana",
		"Eswatini",
		"Lesotho",
		"Mozambique",
		"Namibia",
		"Zimbabwe",
	],
};

/** A plain list of links, as the panels list countries. */
export const linkList: CSSProperties = {
	display: "grid",
	gap: "var(--space-1)",
	margin: 0,
	padding: 0,
	listStyle: "none",
};

const land: CSSProperties = {
	position: "absolute",
	background: "var(--color-map-land)",
	border: "1px solid var(--color-map-border)",
};

/**
 * A stand-in for the map: flat blocks in the map's own colours (ocean, land,
 * border, written, selected). Not a map; only what the panel and chips sit on.
 */
export function FakeMap({ children }: { children?: ReactNode }) {
	return (
		<div
			style={{
				position: "relative",
				height: "100vh",
				minHeight: 560,
				overflow: "hidden",
				background: "var(--color-map-ocean)",
			}}
		>
			<div aria-hidden="true">
				<div style={{ ...land, inset: "-5% 42% 58% 18%" }} />
				<div style={{ ...land, inset: "8% -5% 38% 60%" }} />
				<div style={{ ...land, inset: "46% 30% -5% 36%" }} />
				<div
					style={{
						...land,
						inset: "46% 52% 34% 36%",
						background: "var(--color-map-written)",
					}}
				/>
				<div
					style={{
						...land,
						inset: "66% 46% 12% 40%",
						background: "var(--color-map-selected)",
					}}
				/>
				<div style={{ ...land, inset: "70% 4% 6% 74%" }} />
			</div>
			{children}
		</div>
	);
}

/** A small muted caption over a variant, in stories that compare alternatives. */
export function Caption({ children }: { children: ReactNode }) {
	return (
		<p
			style={{
				margin: 0,
				color: "var(--color-text-muted)",
				fontSize: "var(--font-size-sm)",
			}}
		>
			{children}
		</p>
	);
}
