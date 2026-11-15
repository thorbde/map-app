# 0011: The editor: CodeMirror with a formatting toolbar, no preview

- **Status:** accepted
- **Date:** 2026-11-15
- **Supersedes:** the "editor preview" part of ADR 0004, and the Edit / Preview / Split views in `docs/specs/mvp.md`

## Context
The MVP spec asked for a Markdown editor with Edit, Preview and Split views. Thor wants writing to feel like a simple text editor instead: buttons for headings, bold, italic and so on, and no separate preview. Writers shouldn't need to know Markdown.

## Decision
- **CodeMirror 6** with Markdown, styled so the text looks formatted as you type: headings are larger, bold is bold, and the Markdown markers (`##`, `**`) are dimmed or hidden away from the cursor.
- **A formatting toolbar:** heading, subheading, bold, italic, link, bulleted list, quote and emoji, with keyboard shortcuts for each. **The toolbar only offers what the publish pipeline allows** (ADR 0004: no images, no raw HTML), so what you write is what gets published.
- **No preview mode.** Markdown stays the stored format, and publishing still renders and sanitizes on the server once (ADR 0004, unchanged).
- **Emoji:** the toolbar button either opens the operating system's own emoji picker or a small picker. That's decided in the writing milestone's plan; a picker library needs an ADR entry.
- **CodeMirror loads only on `/write/*`,** as before.

## Alternatives considered
- **Edit / Preview / Split (the original spec):** shows Markdown syntax to writers and needs a server round trip for the preview.
- **A rich-text editor such as TipTap or Lexical, converting to Markdown:** a true WYSIWYG feel, but heavier, and converting back and forth can lose or change formatting.
- **A plain textarea:** too bare for a 400–600 word essay with structure.

## Consequences
- **The editor's look comes from CodeMirror styling, not from the published HTML,** so the two can differ slightly (spacing, fonts). The essay page is the true result, one click away after publishing.
- **The editor's styling is owned by the design system:** its colours and type come from `@thorbde/tokens`.
