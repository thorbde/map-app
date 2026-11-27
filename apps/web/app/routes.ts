import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	// Temporary, until the app shell arrives in M1 PR 5 (docs/specs/m1.md).
	route("preview/map", "routes/preview.map.tsx"),
	// Sign-in (features/auth): Better Auth's routes, and the two forms' actions.
	route("api/auth/*", "routes/api.auth.ts"),
	route("auth/sign-in", "routes/auth.sign-in.ts"),
	route("auth/sign-out", "routes/auth.sign-out.ts"),
] satisfies RouteConfig;
