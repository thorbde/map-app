// "Continue with Google": a plain form posts here, and the browser is sent on to Google.
import { signIn } from "../features/auth/index.server";
import type { Route } from "./+types/auth.sign-in";

export function action({ request }: Route.ActionArgs) {
	return signIn(request);
}
