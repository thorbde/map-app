// Hand-written corrections to the facts from Wikidata (ADR 0012). A fact given here
// always wins, and the monthly job never changes this file. Each one has a reason.
//
// These are choices made by a person, so they are reviewed like code. Kosovo's and
// Taiwan's are Thor's own decisions (ADR 0019); don't change them without him.

import type { FactOverride } from "./facts-types";

const noGovernment =
	"Wikidata has no current form of government (November 2026). Filled in by hand.";
const thor = "Thor's decision, 2026-11-16 (contested on Wikidata, so pinned):";
// Western Sahara is in the list by Thor's decision of 2026-11-17 (ADR 0019). Most of
// it is controlled by Morocco, and its facts are contested. The values below were
// proposed by the agent and are waiting for Thor's review: change them with him.
const westernSahara =
	"Western Sahara is in the list (Thor, 2026-11-17). Wikidata doesn't list this border.";
const westernSaharaPinned =
	"Wikidata's value for the Sahrawi Arab Democratic Republic (Q40362), pinned because it is contested. For Thor's review:";

const freeAssociation =
	"Wikidata has no form of government. A self-governing parliamentary democracy in free association with New Zealand, whose monarch is its head of state. In the list under Thor's rule of 2026-11-17: prefer inclusion (ADR 0019).";

const landOnly =
	"Wikidata counts sea borders, or misses a land border. Only land borders count.";

export const factOverrides: Record<string, FactOverride> = {
	AE: {
		neighbours: { value: ["OM", "SA"], reason: landOnly },
	},
	AF: {
		languages: {
			value: ["Dari", "Pashto"],
			reason:
				"Wikidata adds seven regional languages. Dari and Pashto are the two official ones.",
		},
	},
	AG: {
		capitals: {
			value: ["St. John's"],
			reason: "Wikidata has no current capital.",
		},
		languages: {
			value: ["English"],
			reason: "Wikidata also lists Spanish, which is not official.",
		},
	},
	AL: {
		neighbours: {
			value: ["GR", "ME", "MK", "XK"],
			reason: `${thor} Albania borders Kosovo, not Serbia. Wikidata lists both.`,
		},
	},
	AO: {
		neighbours: { value: ["CD", "CG", "NA", "ZM"], reason: landOnly },
	},
	AU: {
		neighbours: { value: [], reason: landOnly },
	},
	BE: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	BH: {
		neighbours: { value: [], reason: landOnly },
	},
	BN: {
		languages: {
			value: ["English", "Malay"],
			reason: 'Wikidata calls English "British English".',
		},
	},
	CF: {
		government: { value: "presidential system", reason: noGovernment },
	},
	CK: {
		government: { value: "constitutional monarchy", reason: freeAssociation },
	},
	CN: {
		languages: {
			value: ["Mandarin Chinese"],
			reason: 'Wikidata calls it "Putonghua".',
		},
		neighbours: {
			value: [
				"AF",
				"BT",
				"IN",
				"KG",
				"KP",
				"KZ",
				"LA",
				"MM",
				"MN",
				"NP",
				"PK",
				"RU",
				"TJ",
				"VN",
			],
			reason: landOnly,
		},
	},
	CO: {
		neighbours: { value: ["BR", "EC", "PA", "PE", "VE"], reason: landOnly },
	},
	CR: {
		government: { value: "presidential system", reason: noGovernment },
	},
	CU: {
		government: { value: "one-party state", reason: noGovernment },
	},
	CY: {
		languages: {
			value: ["Greek", "Turkish"],
			reason: 'Wikidata calls Greek "Modern Greek".',
		},
	},
	DJ: {
		government: { value: "presidential system", reason: noGovernment },
	},
	DK: {
		neighbours: { value: ["DE"], reason: landOnly },
	},
	DM: {
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	DO: {
		government: { value: "presidential system", reason: noGovernment },
	},
	DZ: {
		neighbours: {
			value: ["EH", "LY", "MA", "ML", "MR", "NE", "TN"],
			reason: westernSahara,
		},
	},
	EH: {
		capitals: {
			value: ["Laayoune", "Tifariti"],
			reason: `${westernSaharaPinned} Laayoune is the capital the republic claims, and is under Moroccan control; Tifariti is its temporary capital. The alternatives are either one alone.`,
		},
		languages: {
			value: ["Arabic", "Spanish"],
			reason: `${westernSaharaPinned} the republic's official languages.`,
		},
		government: {
			value: "republic",
			reason: `${westernSaharaPinned} the republic governs from exile and controls the part east of the sand wall.`,
		},
		neighbours: { value: ["DZ", "MA", "MR"], reason: westernSahara },
	},
	ER: {
		government: { value: "one-party state", reason: noGovernment },
	},
	FJ: {
		government: { value: "parliamentary republic", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	FM: {
		neighbours: { value: [], reason: landOnly },
	},
	GA: {
		neighbours: { value: ["CG", "CM", "GQ"], reason: landOnly },
	},
	GD: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	GH: {
		government: { value: "presidential system", reason: noGovernment },
	},
	GN: {
		languages: {
			value: ["French"],
			reason: 'Wikidata adds "languages of Guinea", which is not a language.',
		},
	},
	GQ: {
		government: { value: "presidential system", reason: noGovernment },
		neighbours: { value: ["CM", "GA"], reason: landOnly },
	},
	GW: {
		government: { value: "military junta", reason: noGovernment },
	},
	HT: {
		government: { value: "semi-presidential system", reason: noGovernment },
	},
	ID: {
		neighbours: { value: ["MY", "PG", "TL"], reason: landOnly },
	},
	IL: {
		capitals: {
			value: ["Jerusalem"],
			reason: `${thor} Wikidata's value: Israel's own position.`,
		},
		neighbours: { value: ["EG", "JO", "LB", "PS", "SY"], reason: landOnly },
	},
	IN: {
		neighbours: {
			value: ["BD", "BT", "CN", "MM", "NP", "PK"],
			reason: landOnly,
		},
	},
	IQ: {
		languages: {
			value: ["Arabic", "Kurdish"],
			reason: 'Wikidata calls Kurdish "Kurdish language".',
		},
	},
	IR: {
		neighbours: {
			value: ["AF", "AM", "AZ", "IQ", "PK", "TM", "TR"],
			reason: landOnly,
		},
	},
	IT: {
		neighbours: {
			value: ["AT", "CH", "FR", "SI", "SM", "VA"],
			reason: landOnly,
		},
	},
	JM: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	JO: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	JP: {
		neighbours: { value: [], reason: landOnly },
	},
	KE: {
		government: { value: "presidential system", reason: noGovernment },
	},
	KI: {
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	KP: {
		languages: {
			value: ["Korean"],
			reason:
				'Wikidata lists Korean twice, once as "North Korean standard language".',
		},
	},
	KR: {
		neighbours: { value: ["KP"], reason: landOnly },
	},
	KW: {
		neighbours: { value: ["IQ", "SA"], reason: landOnly },
	},
	LC: {
		neighbours: { value: [], reason: landOnly },
	},
	LK: {
		neighbours: { value: [], reason: landOnly },
	},
	MA: {
		neighbours: { value: ["DZ", "EH", "ES"], reason: westernSahara },
	},
	MG: {
		neighbours: { value: [], reason: landOnly },
	},
	MH: {
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	ML: {
		government: { value: "military junta", reason: noGovernment },
	},
	MR: {
		neighbours: { value: ["DZ", "EH", "ML", "SN"], reason: westernSahara },
	},
	MT: {
		neighbours: { value: [], reason: landOnly },
	},
	MU: {
		neighbours: { value: [], reason: landOnly },
	},
	MV: {
		government: { value: "presidential system", reason: noGovernment },
	},
	MW: {
		government: { value: "presidential system", reason: noGovernment },
	},
	MY: {
		neighbours: { value: ["BN", "ID", "TH"], reason: landOnly },
	},
	MZ: {
		government: { value: "presidential system", reason: noGovernment },
	},
	NA: {
		government: { value: "semi-presidential system", reason: noGovernment },
	},
	NE: {
		government: { value: "military junta", reason: noGovernment },
	},
	NG: {
		neighbours: { value: ["BJ", "CM", "NE", "TD"], reason: landOnly },
	},
	NI: {
		neighbours: { value: ["CR", "HN"], reason: landOnly },
	},
	NR: {
		capitals: {
			value: ["Yaren"],
			reason:
				'Wikidata calls it "Yaren District". Nauru has no official capital; Yaren is where the government sits.',
		},
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	NU: {
		government: { value: "constitutional monarchy", reason: freeAssociation },
	},
	OM: {
		neighbours: { value: ["AE", "SA", "YE"], reason: landOnly },
	},
	PG: {
		government: { value: "constitutional monarchy", reason: noGovernment },
		neighbours: { value: ["ID"], reason: landOnly },
	},
	PH: {
		languages: {
			value: ["English", "Filipino"],
			reason: "Wikidata adds Taglish, which is not official.",
		},
		neighbours: { value: [], reason: landOnly },
	},
	PS: {
		capitals: {
			value: ["East Jerusalem", "Ramallah"],
			reason: `${thor} Wikidata's value: Palestine's own position.`,
		},
		neighbours: { value: ["EG", "IL", "JO"], reason: landOnly },
	},
	PW: {
		languages: {
			value: ["English", "Palauan"],
			reason:
				"Wikidata adds Japanese, which is official only in the state of Angaur.",
		},
		government: { value: "presidential system", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	PY: {
		government: { value: "presidential system", reason: noGovernment },
	},
	QA: {
		neighbours: { value: ["SA"], reason: landOnly },
	},
	RS: {
		neighbours: {
			value: ["BA", "BG", "HR", "HU", "ME", "MK", "RO", "XK"],
			reason: `${thor} Serbia borders Kosovo, not Albania. Wikidata lists both.`,
		},
	},
	RU: {
		government: { value: "semi-presidential system", reason: noGovernment },
		neighbours: {
			value: [
				"AZ",
				"BY",
				"CN",
				"EE",
				"FI",
				"GE",
				"KP",
				"KZ",
				"LT",
				"LV",
				"MN",
				"NO",
				"PL",
				"UA",
			],
			reason: landOnly,
		},
	},
	SA: {
		neighbours: {
			value: ["AE", "IQ", "JO", "KW", "OM", "QA", "YE"],
			reason: landOnly,
		},
	},
	SB: {
		government: { value: "constitutional monarchy", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	SC: {
		government: { value: "presidential system", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	SE: {
		neighbours: { value: ["FI", "NO"], reason: landOnly },
	},
	SG: {
		neighbours: { value: [], reason: landOnly },
	},
	SN: {
		languages: {
			value: ["French"],
			reason:
				"Wikidata adds Wolof, Badyara and Balanta, which are national languages, not official ones.",
		},
	},
	ST: {
		government: { value: "semi-presidential system", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	TD: {
		government: { value: "presidential system", reason: noGovernment },
	},
	TG: {
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	TL: {
		neighbours: { value: ["ID"], reason: landOnly },
	},
	TO: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	TV: {
		government: { value: "constitutional monarchy", reason: noGovernment },
	},
	TW: {
		capitals: {
			value: ["Taipei"],
			reason: `${thor} Wikidata's value.`,
		},
		languages: {
			value: ["Mandarin Chinese"],
			reason: `${thor} Wikidata lists 22 national languages. Mandarin is the language of government and schools.`,
		},
		government: {
			value: "semi-presidential system",
			reason: `${thor} Wikidata's value.`,
		},
		neighbours: {
			value: [],
			reason: `${thor} An island. Wikidata lists sea borders with Japan and the Philippines.`,
		},
	},
	TZ: {
		government: { value: "presidential system", reason: noGovernment },
		neighbours: {
			value: ["BI", "CD", "KE", "MW", "MZ", "RW", "UG", "ZM"],
			reason: landOnly,
		},
	},
	US: {
		languages: {
			value: ["English"],
			reason:
				"Wikidata lists only languages of the territories. English is the official language.",
		},
	},
	UY: {
		languages: {
			value: ["Spanish"],
			reason:
				"Wikidata has no official language. Spanish is the language of government.",
		},
	},
	VE: {
		neighbours: { value: ["BR", "CO", "GY"], reason: landOnly },
	},
	VU: {
		government: { value: "parliamentary republic", reason: noGovernment },
		neighbours: { value: [], reason: landOnly },
	},
	WS: {
		government: { value: "parliamentary republic", reason: noGovernment },
	},
	XK: {
		capitals: {
			value: ["Pristina"],
			reason: `${thor} Wikidata's value.`,
		},
		languages: {
			value: ["Albanian", "Serbian"],
			reason: `${thor} Wikidata's value.`,
		},
		government: {
			value: "parliamentary republic",
			reason: `${thor} Wikidata's value.`,
		},
		neighbours: {
			value: ["AL", "ME", "MK", "RS"],
			reason: `${thor} Wikidata's value. Kosovo is its own country here (ADR 0019), so it borders Serbia.`,
		},
	},
	ZW: {
		government: { value: "presidential system", reason: noGovernment },
	},
};
