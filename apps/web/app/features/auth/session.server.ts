// Sign-in, sign-out and "who is signed in", for routes. Each one hands the request to Better
// Auth's own endpoints, so its origin check and rate limiter apply exactly as they do to
// /api/auth/*; we only turn its JSON answers into redirects, so the forms work without JavaScript.
import { getSessionCookie } from "better-auth/cookies";
import { getAuth } from "./auth.server";

type Viewer = { id: string; name: string };

// Signed-in pages must never be stored in a shared cache (ADR 0003).
const privateNoStore = { "Cache-Control": "private, no-store" };

// Calls one of Better Auth's endpoints as the browser would, with the browser's cookies and origin.
function callAuth(request: Request, path: string, body: unknown) {
	const headers = new Headers();
	for (const name of ["cookie", "origin", "user-agent", "cf-connecting-ip"]) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	headers.set("content-type", "application/json");
	const url = new URL(`/api/auth${path}`, request.url);
	return getAuth().handler(
		new Request(url, { method: "POST", headers, body: JSON.stringify(body) }),
	);
}

// A redirect that carries Better Auth's cookies with it.
function redirectWithCookies(location: string, from: Response) {
	const headers = new Headers({ Location: location, ...privateNoStore });
	for (const cookie of from.headers.getSetCookie())
		headers.append("Set-Cookie", cookie);
	return new Response(null, { status: 302, headers });
}

// Starts "Continue with Google": Better Auth makes the state cookie and Google's address.
export async function signIn(request: Request): Promise<Response> {
	const response = await callAuth(request, "/sign-in/social", {
		provider: "google",
		callbackURL: "/",
		errorCallbackURL: "/?sign-in=failed",
	});
	if (!response.ok) return passOn(response);
	const { url } = (await response.json()) as { url?: string };
	if (!url) throw new Error("Better Auth gave no address for Google");
	return redirectWithCookies(url, response);
}

export async function signOut(request: Request): Promise<Response> {
	const response = await callAuth(request, "/sign-out", {});
	if (!response.ok) return passOn(response);
	return redirectWithCookies("/", response);
}

// Better Auth's own refusals (rate limit, a foreign origin) reach the browser as they are.
function passOn(response: Response) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(privateNoStore))
		headers.set(name, value);
	return new Response(response.body, { status: response.status, headers });
}

// Who is signed in, or null. `headers` carries a renewed session cookie when Better Auth renews
// the session (once a day); the route returns them with its data.
export async function getViewer(
	request: Request,
): Promise<{ viewer: Viewer | null; headers: Headers }> {
	// No session cookie: nobody is signed in, and the database isn't asked.
	if (!getSessionCookie(request))
		return { viewer: null, headers: new Headers(privateNoStore) };
	const { headers, response } = await getAuth().api.getSession({
		headers: request.headers,
		returnHeaders: true,
	});
	const viewer = response
		? { id: response.user.id, name: response.user.name }
		: null;
	for (const [name, value] of Object.entries(privateNoStore))
		headers.set(name, value);
	return { viewer, headers };
}

// Everything under /api/auth/*: Better Auth's own routes, including Google's callback.
export function handleAuthRequest(request: Request): Promise<Response> {
	return getAuth().handler(request);
}
