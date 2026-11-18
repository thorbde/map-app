import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	// Temporary, until the app shell arrives in M1 PR 5 (docs/specs/m1.md).
	route("preview/map", "routes/preview.map.tsx"),
] satisfies RouteConfig;
