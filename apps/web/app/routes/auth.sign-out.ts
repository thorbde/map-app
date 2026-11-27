// "Sign out": a plain form posts here. Never a link, so nothing can sign a person out by accident.
import { signOut } from "../features/auth/index.server";
import type { Route } from "./+types/auth.sign-out";

export function action({ request }: Route.ActionArgs) {
	return signOut(request);
}
