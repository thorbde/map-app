// The countries in scope (docs/specs/mvp.md §1, ADR 0019): the 193 UN members,
// Palestine and the Vatican (the UN's two observer states), and Kosovo, Taiwan,
// Western Sahara, the Cook Islands and Niue.
//
// - Names are Unicode CLDR's English names (CLDR 48.0), copied as they are.
//   Palestine and Myanmar use CLDR's short form.
// - Africa's regions are the African Union's. Everywhere else they are the UN M49
//   sub-regions, with the Americas split into North and South America.

export type Continent =
	| "africa"
	| "europe"
	| "asia"
	| "north-america"
	| "south-america"
	| "oceania";

/** The continents, in the order the app lists them. */
export const continents = {
	africa: { name: "Africa" },
	europe: { name: "Europe" },
	asia: { name: "Asia" },
	"north-america": { name: "North America" },
	"south-america": { name: "South America" },
	oceania: { name: "Oceania" },
} as const satisfies Record<Continent, { name: string }>;

export const regions = {
	"north-africa": { name: "North Africa", continent: "africa" },
	"west-africa": { name: "West Africa", continent: "africa" },
	"central-africa": { name: "Central Africa", continent: "africa" },
	"east-africa": { name: "East Africa", continent: "africa" },
	"southern-africa": { name: "Southern Africa", continent: "africa" },
	"eastern-europe": { name: "Eastern Europe", continent: "europe" },
	"northern-europe": { name: "Northern Europe", continent: "europe" },
	"southern-europe": { name: "Southern Europe", continent: "europe" },
	"western-europe": { name: "Western Europe", continent: "europe" },
	"central-asia": { name: "Central Asia", continent: "asia" },
	"eastern-asia": { name: "Eastern Asia", continent: "asia" },
	"south-eastern-asia": { name: "South-eastern Asia", continent: "asia" },
	"southern-asia": { name: "Southern Asia", continent: "asia" },
	"western-asia": { name: "Western Asia", continent: "asia" },
	"northern-america": { name: "Northern America", continent: "north-america" },
	"central-america": { name: "Central America", continent: "north-america" },
	caribbean: { name: "Caribbean", continent: "north-america" },
	"south-america": { name: "South America", continent: "south-america" },
	"australia-and-new-zealand": {
		name: "Australia and New Zealand",
		continent: "oceania",
	},
	melanesia: { name: "Melanesia", continent: "oceania" },
	micronesia: { name: "Micronesia", continent: "oceania" },
	polynesia: { name: "Polynesia", continent: "oceania" },
} as const satisfies Record<string, { name: string; continent: Continent }>;

export type RegionId = keyof typeof regions;

export type Country = {
	/** ISO 3166-1 alpha-2. Kosovo's XK is a user-assigned code, not an official one. */
	iso: string;
	name: string;
	continent: Continent;
	region: RegionId;
};

// A country's continent follows from its region, so the rows don't repeat it.
const rows: readonly Omit<Country, "continent">[] = [
	// North Africa
	{ iso: "DZ", name: "Algeria", region: "north-africa" },
	{ iso: "EG", name: "Egypt", region: "north-africa" },
	{ iso: "LY", name: "Libya", region: "north-africa" },
	{ iso: "MR", name: "Mauritania", region: "north-africa" },
	{ iso: "MA", name: "Morocco", region: "north-africa" },
	{ iso: "TN", name: "Tunisia", region: "north-africa" },
	{ iso: "EH", name: "Western Sahara", region: "north-africa" },
	// West Africa
	{ iso: "BJ", name: "Benin", region: "west-africa" },
	{ iso: "BF", name: "Burkina Faso", region: "west-africa" },
	{ iso: "CV", name: "Cape Verde", region: "west-africa" },
	{ iso: "CI", name: "Côte d’Ivoire", region: "west-africa" },
	{ iso: "GM", name: "Gambia", region: "west-africa" },
	{ iso: "GH", name: "Ghana", region: "west-africa" },
	{ iso: "GN", name: "Guinea", region: "west-africa" },
	{ iso: "GW", name: "Guinea-Bissau", region: "west-africa" },
	{ iso: "LR", name: "Liberia", region: "west-africa" },
	{ iso: "ML", name: "Mali", region: "west-africa" },
	{ iso: "NE", name: "Niger", region: "west-africa" },
	{ iso: "NG", name: "Nigeria", region: "west-africa" },
	{ iso: "SN", name: "Senegal", region: "west-africa" },
	{ iso: "SL", name: "Sierra Leone", region: "west-africa" },
	{ iso: "TG", name: "Togo", region: "west-africa" },
	// Central Africa
	{ iso: "BI", name: "Burundi", region: "central-africa" },
	{ iso: "CM", name: "Cameroon", region: "central-africa" },
	{ iso: "CF", name: "Central African Republic", region: "central-africa" },
	{ iso: "TD", name: "Chad", region: "central-africa" },
	{ iso: "CG", name: "Congo - Brazzaville", region: "central-africa" },
	{ iso: "CD", name: "Congo - Kinshasa", region: "central-africa" },
	{ iso: "GQ", name: "Equatorial Guinea", region: "central-africa" },
	{ iso: "GA", name: "Gabon", region: "central-africa" },
	{ iso: "ST", name: "São Tomé & Príncipe", region: "central-africa" },
	// East Africa
	{ iso: "KM", name: "Comoros", region: "east-africa" },
	{ iso: "DJ", name: "Djibouti", region: "east-africa" },
	{ iso: "ER", name: "Eritrea", region: "east-africa" },
	{ iso: "ET", name: "Ethiopia", region: "east-africa" },
	{ iso: "KE", name: "Kenya", region: "east-africa" },
	{ iso: "MG", name: "Madagascar", region: "east-africa" },
	{ iso: "MU", name: "Mauritius", region: "east-africa" },
	{ iso: "RW", name: "Rwanda", region: "east-africa" },
	{ iso: "SC", name: "Seychelles", region: "east-africa" },
	{ iso: "SO", name: "Somalia", region: "east-africa" },
	{ iso: "SS", name: "South Sudan", region: "east-africa" },
	{ iso: "SD", name: "Sudan", region: "east-africa" },
	{ iso: "TZ", name: "Tanzania", region: "east-africa" },
	{ iso: "UG", name: "Uganda", region: "east-africa" },
	// Southern Africa
	{ iso: "AO", name: "Angola", region: "southern-africa" },
	{ iso: "BW", name: "Botswana", region: "southern-africa" },
	{ iso: "SZ", name: "Eswatini", region: "southern-africa" },
	{ iso: "LS", name: "Lesotho", region: "southern-africa" },
	{ iso: "MW", name: "Malawi", region: "southern-africa" },
	{ iso: "MZ", name: "Mozambique", region: "southern-africa" },
	{ iso: "NA", name: "Namibia", region: "southern-africa" },
	{ iso: "ZA", name: "South Africa", region: "southern-africa" },
	{ iso: "ZM", name: "Zambia", region: "southern-africa" },
	{ iso: "ZW", name: "Zimbabwe", region: "southern-africa" },
	// Eastern Europe
	{ iso: "BY", name: "Belarus", region: "eastern-europe" },
	{ iso: "BG", name: "Bulgaria", region: "eastern-europe" },
	{ iso: "CZ", name: "Czechia", region: "eastern-europe" },
	{ iso: "HU", name: "Hungary", region: "eastern-europe" },
	{ iso: "MD", name: "Moldova", region: "eastern-europe" },
	{ iso: "PL", name: "Poland", region: "eastern-europe" },
	{ iso: "RO", name: "Romania", region: "eastern-europe" },
	{ iso: "RU", name: "Russia", region: "eastern-europe" },
	{ iso: "SK", name: "Slovakia", region: "eastern-europe" },
	{ iso: "UA", name: "Ukraine", region: "eastern-europe" },
	// Northern Europe
	{ iso: "DK", name: "Denmark", region: "northern-europe" },
	{ iso: "EE", name: "Estonia", region: "northern-europe" },
	{ iso: "FI", name: "Finland", region: "northern-europe" },
	{ iso: "IS", name: "Iceland", region: "northern-europe" },
	{ iso: "IE", name: "Ireland", region: "northern-europe" },
	{ iso: "LV", name: "Latvia", region: "northern-europe" },
	{ iso: "LT", name: "Lithuania", region: "northern-europe" },
	{ iso: "NO", name: "Norway", region: "northern-europe" },
	{ iso: "SE", name: "Sweden", region: "northern-europe" },
	{ iso: "GB", name: "United Kingdom", region: "northern-europe" },
	// Southern Europe
	{ iso: "AL", name: "Albania", region: "southern-europe" },
	{ iso: "AD", name: "Andorra", region: "southern-europe" },
	{ iso: "BA", name: "Bosnia & Herzegovina", region: "southern-europe" },
	{ iso: "HR", name: "Croatia", region: "southern-europe" },
	{ iso: "GR", name: "Greece", region: "southern-europe" },
	{ iso: "IT", name: "Italy", region: "southern-europe" },
	// Disputed, and included on purpose: ADR 0019.
	{ iso: "XK", name: "Kosovo", region: "southern-europe" },
	{ iso: "MT", name: "Malta", region: "southern-europe" },
	{ iso: "ME", name: "Montenegro", region: "southern-europe" },
	{ iso: "MK", name: "North Macedonia", region: "southern-europe" },
	{ iso: "PT", name: "Portugal", region: "southern-europe" },
	{ iso: "SM", name: "San Marino", region: "southern-europe" },
	{ iso: "RS", name: "Serbia", region: "southern-europe" },
	{ iso: "SI", name: "Slovenia", region: "southern-europe" },
	{ iso: "ES", name: "Spain", region: "southern-europe" },
	{ iso: "VA", name: "Vatican City", region: "southern-europe" },
	// Western Europe
	{ iso: "AT", name: "Austria", region: "western-europe" },
	{ iso: "BE", name: "Belgium", region: "western-europe" },
	{ iso: "FR", name: "France", region: "western-europe" },
	{ iso: "DE", name: "Germany", region: "western-europe" },
	{ iso: "LI", name: "Liechtenstein", region: "western-europe" },
	{ iso: "LU", name: "Luxembourg", region: "western-europe" },
	{ iso: "MC", name: "Monaco", region: "western-europe" },
	{ iso: "NL", name: "Netherlands", region: "western-europe" },
	{ iso: "CH", name: "Switzerland", region: "western-europe" },
	// Central Asia
	{ iso: "KZ", name: "Kazakhstan", region: "central-asia" },
	{ iso: "KG", name: "Kyrgyzstan", region: "central-asia" },
	{ iso: "TJ", name: "Tajikistan", region: "central-asia" },
	{ iso: "TM", name: "Turkmenistan", region: "central-asia" },
	{ iso: "UZ", name: "Uzbekistan", region: "central-asia" },
	// Eastern Asia
	{ iso: "CN", name: "China", region: "eastern-asia" },
	{ iso: "JP", name: "Japan", region: "eastern-asia" },
	{ iso: "MN", name: "Mongolia", region: "eastern-asia" },
	{ iso: "KP", name: "North Korea", region: "eastern-asia" },
	{ iso: "KR", name: "South Korea", region: "eastern-asia" },
	// Disputed, and included on purpose: ADR 0019.
	{ iso: "TW", name: "Taiwan", region: "eastern-asia" },
	// South-eastern Asia
	{ iso: "BN", name: "Brunei", region: "south-eastern-asia" },
	{ iso: "KH", name: "Cambodia", region: "south-eastern-asia" },
	{ iso: "ID", name: "Indonesia", region: "south-eastern-asia" },
	{ iso: "LA", name: "Laos", region: "south-eastern-asia" },
	{ iso: "MY", name: "Malaysia", region: "south-eastern-asia" },
	{ iso: "MM", name: "Myanmar", region: "south-eastern-asia" },
	{ iso: "PH", name: "Philippines", region: "south-eastern-asia" },
	{ iso: "SG", name: "Singapore", region: "south-eastern-asia" },
	{ iso: "TH", name: "Thailand", region: "south-eastern-asia" },
	{ iso: "TL", name: "Timor-Leste", region: "south-eastern-asia" },
	{ iso: "VN", name: "Vietnam", region: "south-eastern-asia" },
	// Southern Asia
	{ iso: "AF", name: "Afghanistan", region: "southern-asia" },
	{ iso: "BD", name: "Bangladesh", region: "southern-asia" },
	{ iso: "BT", name: "Bhutan", region: "southern-asia" },
	{ iso: "IN", name: "India", region: "southern-asia" },
	{ iso: "IR", name: "Iran", region: "southern-asia" },
	{ iso: "MV", name: "Maldives", region: "southern-asia" },
	{ iso: "NP", name: "Nepal", region: "southern-asia" },
	{ iso: "PK", name: "Pakistan", region: "southern-asia" },
	{ iso: "LK", name: "Sri Lanka", region: "southern-asia" },
	// Western Asia
	{ iso: "AM", name: "Armenia", region: "western-asia" },
	{ iso: "AZ", name: "Azerbaijan", region: "western-asia" },
	{ iso: "BH", name: "Bahrain", region: "western-asia" },
	{ iso: "CY", name: "Cyprus", region: "western-asia" },
	{ iso: "GE", name: "Georgia", region: "western-asia" },
	{ iso: "IQ", name: "Iraq", region: "western-asia" },
	{ iso: "IL", name: "Israel", region: "western-asia" },
	{ iso: "JO", name: "Jordan", region: "western-asia" },
	{ iso: "KW", name: "Kuwait", region: "western-asia" },
	{ iso: "LB", name: "Lebanon", region: "western-asia" },
	{ iso: "OM", name: "Oman", region: "western-asia" },
	{ iso: "PS", name: "Palestine", region: "western-asia" },
	{ iso: "QA", name: "Qatar", region: "western-asia" },
	{ iso: "SA", name: "Saudi Arabia", region: "western-asia" },
	{ iso: "SY", name: "Syria", region: "western-asia" },
	{ iso: "TR", name: "Türkiye", region: "western-asia" },
	{ iso: "AE", name: "United Arab Emirates", region: "western-asia" },
	{ iso: "YE", name: "Yemen", region: "western-asia" },
	// Northern America
	{ iso: "CA", name: "Canada", region: "northern-america" },
	{ iso: "US", name: "United States", region: "northern-america" },
	// Central America
	{ iso: "BZ", name: "Belize", region: "central-america" },
	{ iso: "CR", name: "Costa Rica", region: "central-america" },
	{ iso: "SV", name: "El Salvador", region: "central-america" },
	{ iso: "GT", name: "Guatemala", region: "central-america" },
	{ iso: "HN", name: "Honduras", region: "central-america" },
	{ iso: "MX", name: "Mexico", region: "central-america" },
	{ iso: "NI", name: "Nicaragua", region: "central-america" },
	{ iso: "PA", name: "Panama", region: "central-america" },
	// Caribbean
	{ iso: "AG", name: "Antigua & Barbuda", region: "caribbean" },
	{ iso: "BS", name: "Bahamas", region: "caribbean" },
	{ iso: "BB", name: "Barbados", region: "caribbean" },
	{ iso: "CU", name: "Cuba", region: "caribbean" },
	{ iso: "DM", name: "Dominica", region: "caribbean" },
	{ iso: "DO", name: "Dominican Republic", region: "caribbean" },
	{ iso: "GD", name: "Grenada", region: "caribbean" },
	{ iso: "HT", name: "Haiti", region: "caribbean" },
	{ iso: "JM", name: "Jamaica", region: "caribbean" },
	{ iso: "KN", name: "St. Kitts & Nevis", region: "caribbean" },
	{ iso: "LC", name: "St. Lucia", region: "caribbean" },
	{ iso: "VC", name: "St. Vincent & Grenadines", region: "caribbean" },
	{ iso: "TT", name: "Trinidad & Tobago", region: "caribbean" },
	// South America
	{ iso: "AR", name: "Argentina", region: "south-america" },
	{ iso: "BO", name: "Bolivia", region: "south-america" },
	{ iso: "BR", name: "Brazil", region: "south-america" },
	{ iso: "CL", name: "Chile", region: "south-america" },
	{ iso: "CO", name: "Colombia", region: "south-america" },
	{ iso: "EC", name: "Ecuador", region: "south-america" },
	{ iso: "GY", name: "Guyana", region: "south-america" },
	{ iso: "PY", name: "Paraguay", region: "south-america" },
	{ iso: "PE", name: "Peru", region: "south-america" },
	{ iso: "SR", name: "Suriname", region: "south-america" },
	{ iso: "UY", name: "Uruguay", region: "south-america" },
	{ iso: "VE", name: "Venezuela", region: "south-america" },
	// Australia and New Zealand
	{ iso: "AU", name: "Australia", region: "australia-and-new-zealand" },
	{ iso: "NZ", name: "New Zealand", region: "australia-and-new-zealand" },
	// Melanesia
	{ iso: "FJ", name: "Fiji", region: "melanesia" },
	{ iso: "PG", name: "Papua New Guinea", region: "melanesia" },
	{ iso: "SB", name: "Solomon Islands", region: "melanesia" },
	{ iso: "VU", name: "Vanuatu", region: "melanesia" },
	// Micronesia
	{ iso: "KI", name: "Kiribati", region: "micronesia" },
	{ iso: "MH", name: "Marshall Islands", region: "micronesia" },
	{ iso: "FM", name: "Micronesia", region: "micronesia" },
	{ iso: "NR", name: "Nauru", region: "micronesia" },
	{ iso: "PW", name: "Palau", region: "micronesia" },
	// Polynesia
	{ iso: "CK", name: "Cook Islands", region: "polynesia" },
	{ iso: "NU", name: "Niue", region: "polynesia" },
	{ iso: "WS", name: "Samoa", region: "polynesia" },
	{ iso: "TO", name: "Tonga", region: "polynesia" },
	{ iso: "TV", name: "Tuvalu", region: "polynesia" },
];

export const countries: readonly Country[] = rows.map((row) => ({
	...row,
	continent: regions[row.region].continent,
}));
