# 0005: One working draft per essay, immutable published versions

- **Status:** accepted
- **Date:** 2026-11-15

## Context
Writers need autosave without publishing every keystroke, and readers should only see deliberate publishes. Version history is wanted, but its UI isn't needed for the MVP.

## Decision
- **The working draft lives on `essay`** (`draft_body`, `draft_data`) and autosaves (debounced). `localStorage` is only a crash buffer, wrapped in try/catch.
- **Publish** creates an immutable `essay_version` and points `essay.latest_version_id` at it.
- **Unpublish** sets `unpublished_at`. The versions are kept.
- **Versions are recorded from day one.** The history and restore UI come later (see the roadmap), without a migration.
- A country counts as **written** when it has a latest version, isn't unpublished and isn't hidden.

## Consequences
- The editor shows "Unpublished changes" when the draft differs from the latest version.
- **Never mutate a version.** Fixes always go through a new publish.
