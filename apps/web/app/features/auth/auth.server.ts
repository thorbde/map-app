// Better Auth, set up for Google sign-in (ADR 0007). Everything here is Better Auth's own:
// its Drizzle adapter, its Google provider, its rate limiter, and on previews its OAuth Proxy
// plugin (ADR 0022). Our part is the settings and two hooks that keep only what we need.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins/oauth-proxy";
import {
	type AuthSettings,
	type Database,
	getAuthSettings,
	getDatabase,
} from "../../server/platform/index.server";

// We keep a person's name and email, nothing else from Google (m2.md, question 5). We never
// call Google after sign-in, so its tokens are emptied before the row is written; there is no
// switch for that in Better Auth. Its profile picture is dropped the same way.
const noTokens = {
	accessToken: null,
	refreshToken: null,
	idToken: null,
	accessTokenExpiresAt: null,
	refreshTokenExpiresAt: null,
};

export function createAuth(settings: AuthSettings, db: Database) {
	return betterAuth({
		appName: "Memogra",
		baseURL: settings.BETTER_AUTH_URL,
		secret: settings.BETTER_AUTH_SECRET,
		trustedOrigins: settings.AUTH_TRUSTED_ORIGINS,
		database: drizzleAdapter(db, { provider: "sqlite" }),
		socialProviders: {
			google: {
				clientId: settings.GOOGLE_CLIENT_ID,
				clientSecret: settings.GOOGLE_CLIENT_SECRET,
				prompt: "select_account",
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => ({ data: { ...user, image: null } }),
				},
				update: {
					before: async (user) => ({ data: { ...user, image: null } }),
				},
			},
			account: {
				create: {
					before: async (account) => ({ data: { ...account, ...noTokens } }),
				},
				update: {
					before: async (account) => ({ data: { ...account, ...noTokens } }),
				},
			},
		},
		// On in every environment, not only in production (Better Auth's default), with the
		// counts in the database: a Worker forgets anything kept in memory (ADR 0007).
		rateLimit: {
			enabled: true,
			storage: "database",
			window: 60,
			max: 100,
			customRules: {
				"/sign-in/social": { window: 60, max: 10 },
				"/callback/*": { window: 60, max: 20 },
			},
		},
		advanced: {
			// Requests reach a Worker with the visitor's address in this header only. Without it,
			// everyone would share one count (Better Auth's Cloudflare guide).
			ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
		},
		telemetry: { enabled: false },
		plugins: settings.AUTH_PROXY_URL
			? [
					// Previews: Google answers only at the helper's fixed address, which hands the sign-in
					// back here. The person is created in this preview's own database (ADR 0022).
					oAuthProxy({
						productionURL: settings.AUTH_PROXY_URL,
						currentURL: settings.BETTER_AUTH_URL,
						secret: settings.BETTER_AUTH_SECRET,
					}),
				]
			: settings.AUTH_TRUSTED_ORIGINS.length > 0
				? // The helper: answers Google for the previews, writes nothing itself.
					[
						oAuthProxy({
							productionURL: settings.BETTER_AUTH_URL,
							secret: settings.BETTER_AUTH_SECRET,
						}),
					]
				: [],
	});
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

// One instance per Worker: the settings and the D1 binding don't change between requests,
// and D1 holds no connection open, so this is safe (Better Auth's Cloudflare guide).
export function getAuth(): Auth {
	auth ??= createAuth(getAuthSettings(), getDatabase());
	return auth;
}
