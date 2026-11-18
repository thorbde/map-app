import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	// The map component's own test page (M1 PR 4).
	route("preview/map", "routes/preview.map.tsx"),
	// The map shell (ADR 0010), at temporary addresses until profiles arrive in
	// M4 (docs/specs/m1.md, question 1). The layout keeps the map mounted; each
	// child renders only its panel.
	route("preview", "routes/preview.tsx", [
		index("routes/preview.world.tsx"),
		route(":continent", "routes/preview.continent.tsx"),
		route("country/:iso", "routes/preview.country.tsx"),
	]),
] satisfies RouteConfig;
