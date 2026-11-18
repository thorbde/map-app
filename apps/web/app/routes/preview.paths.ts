import type { PanelPaths } from "../features/countries";

// TEMPORARY addresses (docs/specs/m1.md, question 1): the shell lives under
// /preview until profiles arrive in M4, when these become /u/:username/….
export const previewPaths: PanelPaths = {
	world: "/preview",
	continent: (continent, region) =>
		`/preview/${continent}${region ? `#${region}` : ""}`,
	country: (iso) => `/preview/country/${iso}`,
};
