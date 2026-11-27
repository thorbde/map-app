import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { account, rateLimit, session, user } from "../../server/db/schema";
import {
	getDatabase,
	readAuthSettings,
} from "../../server/platform/index.server";
import { createAuth, getAuth } from "./auth.server";

// Integration tests for sign-in: requests go through the real Worker and React Router, with the
// made-up settings from vitest.config.ts. No request reaches Google.
const origin = "http://localhost";
let ip = 0;

function post(path: string, init: { cookie?: string; ip?: string } = {}) {
	const headers = new Headers({
		origin,
		"cf-connecting-ip": init.ip ?? nextIp(),
	});
	if (init.cookie) headers.set("cookie", init.cookie);
	return exports.default.fetch(`${origin}${path}`, {
		method: "POST",
		headers,
		redirect: "manual",
	});
}

// Every test gets its own visitor address, so the rate limiter never mixes tests up.
function nextIp() {
	ip += 1;
	return `203.0.113.${ip}`;
}

// A signed-in person, made directly in the database, and their signed session cookie as Better
// Auth would set it (the token, a dot, and its HMAC-SHA256 signature).
async function signedInCookie() {
	const db = getDatabase();
	await db
		.insert(user)
		.values({ id: "u1", name: "Ada", email: "ada@example.com" });
	const token = "session-token-u1";
	await db.insert(session).values({
		id: "s1",
		token,
		userId: "u1",
		expiresAt: new Date(Date.now() + 86_400_000),
		updatedAt: new Date(),
	});
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(readAuthSettings(env).BETTER_AUTH_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(token),
	);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
	return `better-auth.session_token=${encodeURIComponent(`${token}.${base64}`)}`;
}

beforeEach(async () => {
	const db = getDatabase();
	await db.batch([
		db.delete(session),
		db.delete(account),
		db.delete(user),
		db.delete(rateLimit),
	]);
});

describe("Better Auth's routes", () => {
	it("answer under /api/auth", async () => {
		const response = await exports.default.fetch(`${origin}/api/auth/ok`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
});

describe("Continue with Google", () => {
	it("sends the browser to Google with our client and our callback, and sets the state cookie", async () => {
		const response = await post("/auth/sign-in");
		expect(response.status).toBe(302);
		const google = new URL(response.headers.get("location") ?? "");
		expect(google.origin).toBe("https://accounts.google.com");
		expect(google.searchParams.get("client_id")).toBe("test-client-id");
		expect(google.searchParams.get("redirect_uri")).toBe(
			`${origin}/api/auth/callback/google`,
		);
		// Only what sign-in needs (Better Auth's default for Google): Google asks no more of the person.
		expect(new Set(google.searchParams.get("scope")?.split(" "))).toEqual(
			new Set(["openid", "email", "profile"]),
		);
		expect(response.headers.getSetCookie().join("\n")).toMatch(
			/better-auth\.state=/,
		);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
	});

	it("is refused for a form posted from another site with the person's cookies", async () => {
		const response = await exports.default.fetch(`${origin}/auth/sign-in`, {
			method: "POST",
			headers: {
				origin: "https://evil.example",
				cookie: "better-auth.session_token=anything",
				"cf-connecting-ip": nextIp(),
			},
			redirect: "manual",
		});
		expect(response.status).toBe(403);
	});

	it("on a preview, goes through the helper's fixed address (ADR 0022)", async () => {
		const settings = readAuthSettings({
			...env,
			BETTER_AUTH_URL: "https://map-app-pr-7.previews.example",
			AUTH_PROXY_URL: "https://memogra-main.previews.example",
		});
		const preview = createAuth(settings, getDatabase());
		const response = await preview.handler(
			new Request(
				"https://map-app-pr-7.previews.example/api/auth/sign-in/social",
				{
					method: "POST",
					headers: {
						origin: "https://map-app-pr-7.previews.example",
						"content-type": "application/json",
					},
					body: JSON.stringify({ provider: "google", callbackURL: "/" }),
				},
			),
		);
		const { url } = (await response.json()) as { url: string };
		expect(new URL(url).searchParams.get("redirect_uri")).toBe(
			"https://memogra-main.previews.example/api/auth/callback/google",
		);
	});
});

describe("rate limiting", () => {
	it("stops one visitor after 10 sign-ins a minute, counted in the database, and not the next visitor", async () => {
		const visitor = nextIp();
		for (let i = 0; i < 10; i++) {
			expect((await post("/auth/sign-in", { ip: visitor })).status).toBe(302);
		}
		expect((await post("/auth/sign-in", { ip: visitor })).status).toBe(429);
		expect((await post("/auth/sign-in")).status).toBe(302);
		expect(
			(await getDatabase().select().from(rateLimit)).length,
		).toBeGreaterThan(0);
	});
});

describe("who is signed in", () => {
	it("nobody, without a session cookie", async () => {
		const response = await exports.default.fetch(`${origin}/`);
		const html = await response.text();
		expect(html).toContain("Continue with Google");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
	});

	it("the person whose session cookie it is", async () => {
		const cookie = await signedInCookie();
		const response = await exports.default.fetch(`${origin}/`, {
			headers: { cookie },
		});
		const html = await response.text();
		expect(html).toContain("Hello, Ada");
		expect(html).toContain("Sign out");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
	});

	it("nobody, once they have signed out: the session is gone and the cookie cleared", async () => {
		const cookie = await signedInCookie();
		const response = await post("/auth/sign-out", { cookie });
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/");
		expect(response.headers.getSetCookie().join("\n")).toMatch(
			/better-auth\.session_token=;.*Max-Age=0/i,
		);
		expect(await getDatabase().select().from(session)).toEqual([]);
	});
});

describe("what we keep from Google (name and email only)", () => {
	it("no tokens and no picture, even when Google sends them", async () => {
		const context = await getAuth().$context;
		await context.internalAdapter.createOAuthUser(
			{
				name: "Ada",
				email: "ada@example.com",
				emailVerified: true,
				image: "https://lh3.googleusercontent.com/a/picture",
			},
			{
				providerId: "google",
				accountId: "google-sub-1",
				accessToken: "ya29.access",
				refreshToken: "1//refresh",
				idToken: "eyJ.id.token",
				accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
				scope: "openid,email,profile",
			},
		);
		const [person] = await getDatabase().select().from(user);
		expect(person).toMatchObject({
			name: "Ada",
			email: "ada@example.com",
			image: null,
		});
		const [link] = await getDatabase().select().from(account);
		expect(link).toMatchObject({
			providerId: "google",
			accountId: "google-sub-1",
			accessToken: null,
			refreshToken: null,
			idToken: null,
			accessTokenExpiresAt: null,
		});
	});

	it("nothing at all for a sign-in that Google's answer doesn't complete", async () => {
		const response = await exports.default.fetch(
			`${origin}/api/auth/callback/google?state=made-up&code=made-up`,
			{ headers: { "cf-connecting-ip": nextIp() }, redirect: "manual" },
		);
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toMatch(/error=/);
		const db = getDatabase();
		expect(await db.select().from(user)).toEqual([]);
		expect(await db.select().from(account)).toEqual([]);
		expect(await db.select().from(session)).toEqual([]);
	});
});
