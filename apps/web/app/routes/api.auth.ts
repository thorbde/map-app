// Better Auth's own routes, /api/auth/*, including Google's callback. Nothing of ours here.
import { handleAuthRequest } from "../features/auth/index.server";
import type { Route } from "./+types/api.auth";

export function loader({ request }: Route.LoaderArgs) {
	return handleAuthRequest(request);
}

export function action({ request }: Route.ActionArgs) {
	return handleAuthRequest(request);
}
