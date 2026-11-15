# 0001: Stack: React Router v7 on Cloudflare Workers, Neon Postgres

- **Status:** accepted, partly superseded: the database by ADR 0006, email/password, Resend and Turnstile by ADR 0007, Radix by ADR 0008
- **Date:** 2026-11-15

## Context
This is a hobby app that will be shared with others and eventually take payments through a supporter tier. It needs commercial use allowed on a free or cheap plan, fast loads in Europe, and very little operations work. The code is written by agents, so the stack should be well documented and familiar to them.

## Decision
- **Runtime:** Cloudflare Workers. The free plan allows commercial use. Move to Workers Paid (~$5/month) if CPU limits are hit, most likely on password hashing.
- **Framework:** React Router v7 in framework mode, with the Cloudflare Vite plugin, so local dev runs on workerd.
- **Database:** Neon Postgres in eu-central-1, using `@neondatabase/serverless` with Drizzle. Smart Placement is on.
- **Auth:** Better Auth (email + password, Google). Users stay in our own database.
- **Email:** Resend over HTTP. **Bot protection:** Turnstile.
- **Tooling:** pnpm, Biome, dependency-cruiser, knip, Vitest (Workers pool), Playwright, Storybook.

## Alternatives considered
- **Next.js on Vercel:** Vercel's Hobby plan forbids commercial use (Pro is $20/month), and Next.js's default caching is a privacy footgun for our visibility rules.
- **Next.js on Cloudflare via OpenNext:** a compatibility layer with no local dev on the real runtime.
- **TanStack Start:** strong, but newer, so agents have seen less of it.
- **Astro:** excellent for reading pages, but awkward for the editor and the social app.
- **Self-hosting in Sweden (GleSYS, Bahnhof):** fun, but more operations work and higher fixed cost. Deferred to a later project.
- **Supabase:** the free plan pauses inactive projects.

## Consequences
- **Portability:** Workers-specific APIs live only in `app/server/platform/`. Moving to Node means rewriting that folder.
- **Free-plan limits:** about 10 ms of CPU per request and a ~3 MB bundle. Keep the server bundle lean, and keep map data and datasets out of the bundle.
- **No TCP database connections.** We use Neon's HTTP/WebSocket driver. Add Hyperdrive later only if measurements show we need it.
