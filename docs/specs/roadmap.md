# Roadmap

Rough order. Each item gets its own spec in `docs/specs/` before it's built.

## Iteration 2: social and richer essays
- **Followers.** Follow and unfollow, remove a follower, block.
- **Friends visibility.** A third option, "Friends", for people you follow who also follow you back. This extends ADR 0003.
- **Stars.** Star a map you can view, with a list of your starred maps.
- **Explore.**
  - "Featured writers" (a flag set by an admin)
  - "Popular this month" (stars from the last 30 days, counting only verified accounts)
  - "New and growing"
  - Only public maps with at least 3 essays.
- **Reports and admin queue,** replacing the mailto link.
- **Version history UI.** Browse versions, view one, restore it to the draft.
- **Cities.** GeoNames `cities15000` seeded into Postgres, a combobox in the editor, and a locator map on the essay page.
- **Recall questions and progressive-clue riddles** in the editor.
- **OG images** for public profiles and essays, showing the filled-in map.

## Public launch
- **Supporter tier through Polar** (merchant of record).
  - **Perks:** the study tools from Iteration 3, map themes, a badge.
  - **Never paywalled:** writing, publishing, privacy, export.
- **Open sign-up,** with Turnstile and rate limits on everything.
- **A real privacy policy and terms.** Cloudflare Web Analytics, which is cookie-less.

## Iteration 3: the method as product
- **A guided writing flow:** pretest → study notes → closed-book draft (with the notes hidden) → fact check → encode.
- **"Test me" mode** on essays: free recall, then questions and riddles, then reveal.
- **A review schedule** (1 day, 1 week, 1 month, 3 months, 6 months), stored per user.
- **A quiz page** with a riddle mode and a map mode, plus quizzing on friends' maps.
- **Anki export.**

## Later
- **Translations,** as `essay` rows with another `locale`, plus a language switcher.
- **A map redesign:** a polished, illustrative style.
- **Printed products:** a continent magazine with your essays, maps and riddles, plus map posters.
- **Classroom mode** (only if teachers ask; GDPR rules for minors apply).
- **A Swedish self-hosted deployment,** if it's ever worth it.
