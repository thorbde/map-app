# Design

Designs live on claude.ai as Claude Design canvases. They're private by default; Thor shares them from the canvas's Share menu.

| Canvas | What it shows | Decisions |
|---|---|---|
| [Map App: first sketches](https://claude.ai/artifact/Hp7xBLLRuyxsJvSSh7SCrt) | The map-first app: profile, essay, editor, and the phone bottom sheet, in light and dark | ADRs 0010, 0011, 0012 |

## How designs and code relate

- **Tokens flow one way:** from `packages/tokens` (the source of truth) into the design tools, never back by hand.
- **A design is a sketch, not a spec.** The specs in `docs/specs/` and the ADRs say what gets built. If a design and a spec disagree, ask Thor.
- **UI PRs link the design they implement,** and their screenshots are compared against it.
- **A canvas link always shows its latest version,** not the version a PR was built from.
