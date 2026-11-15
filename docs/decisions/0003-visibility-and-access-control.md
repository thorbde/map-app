# 0003: Visibility and access control

- **Status:** accepted
- **Date:** 2026-11-15

## Context
Users choose who can see their map and essays. A privacy leak is the worst bug this app can have. Leaks usually come from side channels: metadata, OG images, sitemaps, search, counts, and caches. They rarely come from the main page.

## Decision
- **One module, `app/server/access.server.ts`,** is the only gate for reading another user's data:
  - `canViewProfile(viewer, owner): boolean`
  - `canViewEssay(viewer, owner, essay): boolean`
- **MVP rules, in order:**
  1. The owner → yes.
  2. The owner is hidden by an admin → no, except for admins.
  3. `public` → yes, including logged-out visitors.
  4. `private` → no.
- **Essays:** visible only if the profile is visible **and** the essay is published, not unpublished and not hidden. Drafts are owner-only, always.
- **When the profile isn't visible,** show only the display name and username, with "This map is private."
- **No shared caching of viewer-dependent responses.** Static assets and the map geometry may be cached. Pages and loader data for profiles and essays are `Cache-Control: private, no-store` unless they're provably public and purged when visibility changes. In the MVP, simply don't cache them.
- **Every surface goes through the gate:** page loaders, actions, `<title>` and meta tags, sitemaps, export endpoints and any API route.

## Later (roadmap)
- A `friends` visibility (mutual followers), blocks and stars will extend these rules. The function signatures stay the same.

## Tests
- **An integration test matrix:** {owner, other user, logged out, admin} × {public, private, hidden} × {draft, published, unpublished, hidden essay}. It must pass in CI.
- **e2e:** a logged-out visitor can't see private content through any route, including metadata.
