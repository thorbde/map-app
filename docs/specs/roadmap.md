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
- **Email + password sign-in** (Better Auth), with email verification and password reset via Resend, and Turnstile on sign-up. See ADR 0007.
- **Username changes:** once every 30 days, the old username redirects for 30 days and stays reserved (a `username_history` table).
- **Supporter tier through Polar** (merchant of record).
  - **Perks:** the study tools from Iteration 3, map themes, a badge.
  - **Never paywalled:** writing, publishing, privacy, export.
- **Open sign-up,** with rate limits on everything.
- **A real privacy policy and terms.** Cloudflare Web Analytics, which is cookie-less.

## Iteration 3: the method as product
- **A guided writing flow:** pretest → study notes → closed-book draft (with the notes hidden) → fact check → encode.
- **"Test me" mode** on essays: free recall, then questions and riddles, then reveal.
- **A memorization mode:** flashcards, quizzes and hiding and revealing the country's facts (ADR 0012) and your own essay. The normal essay view keeps showing everything.
- **A review schedule** (1 day, 1 week, 1 month, 3 months, 6 months), stored per user.
- **A quiz page** with a riddle mode and a map mode, plus quizzing on friends' maps.
- **Anki export.**

## Use in Swedish schools
Thor wants the app to be **compliant for use in Swedish schools at some point** (added 2026-11-16). No date is set, and nothing is built for it yet.

- **Research comes first:** what a Swedish school, or the municipality that runs it, requires before pupils may use an app. The result is a written list of requirements with sources, and then a spec.
- **Questions for that research.** These are guesses at where the requirements are, not findings:
  - **Children's data:** what GDPR and Swedish rules require for pupils, including those under 13, and who gives consent.
  - **The school as the party responsible for the data:** whether a data processing agreement is needed, and what it must contain.
  - **Sign-in:** whether Google-only sign-in (ADR 0007) is acceptable, or pupils need school accounts or another method.
  - **Where data is stored:** whether EU storage on Cloudflare D1 (ADR 0006) is enough, given the company is American.
  - **Accessibility:** which legal standard applies to tools used in public schools.
  - **Language:** whether the interface and the essays must be available in Swedish.
  - **Pupils' safety:** public profiles, moderation and contact between users when the users are minors.
  - **The curriculum:** how the method and the country list fit what geography teaching covers. The list includes Kosovo and Taiwan (ADR 0019).
- **Related:** "Classroom mode" and "A Swedish self-hosted deployment" under Later.

## Later
- **Translations,** as `essay` rows with another `locale`, plus a language switcher.
- **A map redesign:** a polished, illustrative style.
- **Printed products:** a continent magazine with your essays, maps and riddles, plus map posters.
- **Classroom mode** (only if teachers ask; GDPR rules for minors apply).
- **A Swedish self-hosted deployment,** if it's ever worth it.
