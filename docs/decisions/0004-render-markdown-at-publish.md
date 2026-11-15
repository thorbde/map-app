# 0004: Render markdown to sanitized HTML at publish time

- **Status:** accepted. The editor preview is replaced by a formatted editor with no preview (ADR 0011); everything else stands.
- **Date:** 2026-11-15

## Context
Essays are user-written markdown and therefore untrusted. Rendering on every request costs CPU (the Workers free plan allows ~10 ms per request) and would ship markdown libraries to places that don't need them.

## Decision
- **Render once, at publish time,** in `features/essays/render.server.ts`:
  - remark → rehype, with **raw HTML disabled**
  - **rehype-sanitize** with an allowlist: headings, paragraphs, lists, emphasis, links, blockquotes, code, tables. **No images.**
  - Links get `rel="nofollow ugc noopener"` and `target="_blank"`.
  - `What I got wrong` and `Before I started` are wrapped in `<details>`.
- **Store the result** in `essay_version.rendered_html`. Reading pages serve the stored HTML.
- **The editor preview** uses the same pipeline through a server action, debounced, so the preview always matches what gets published.
- **If the pipeline changes,** add a script that re-renders all versions. Never render lazily on read.

## Consequences
- Reading is fast and cheap, and the markdown libraries never ship to readers.
- **Tests:** `<script>`, `javascript:` links, `on*` attributes and raw HTML all render inert.
