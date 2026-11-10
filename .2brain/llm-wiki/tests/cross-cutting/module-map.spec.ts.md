---
source: tests/cross-cutting/module-map.spec.ts
sha256: 3d8317576d77fdf3afa25c5b9ee9796052d9a6447989f069e7dff2d2ade45287
signature: b4172d6b0ab2d10ef74604b080fefb14d514f8df81602a40c478397629ac9989
generated_at: 2026-11-10T06:38:47.799583+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-map.spec.ts

## Purpose

Validates that the Mermaid context map in `docs/modules/index.md` (under the heading "The whole map") contains only edges that the `moduleDependsOn` manifest permits. It does **not** compare the map to actual source imports; it guards against the visual diagram drifting out of sync with the declared dependency policy.

## Key elements

- **`Edge`** (interface) — `{ from, to, kind }` representing one directed relationship in the map.
- **`KIND_OF_ARROW`** — Maps Mermaid arrow syntax to relationship kinds: `-->` → conformist, `==>` → customer-supplier, `-.->` → published-language.
- **`NODE`** (regex) — Extracts node declarations (`id["label"]`) to build an ID-to-label map.
- **`EDGE`** (regex) — Matches a single edge line, capturing source, arrow, optional `|"kind"|` label, and target. Lines whose label is not one of the three kinds (e.g. `mounts`) are treated as non-context-map and skipped.
- **`mermaidUnder(markdown, heading)`** — Returns the body of the first ` ```mermaid ` block that follows a `## <heading>` line.
- **`parseEdges(mermaid)`** — Parses a Mermaid block into `Edge[]`, resolving node IDs to their display labels.
- **`overviewEdges()`** — Convenience: reads `docs/modules/index.md`, extracts the "The whole map" block, and parses its edges.
- **Test: "reads some edges at all"** — Sanity-checks that the parser finds more than 5 edges (guards against a broken regex or missing diagram).
- **Test: "draws only edges dependsOn allows"** — Filters `overviewEdges()` through `moduleDependsOn` and asserts the refusal list is empty.

## Relationships

- **`scripts/module-manifest.ts`** — Imports `moduleDependsOn`, the authoritative per-module dependency list. The "draws only edges dependsOn allows" test is the sole coupling: every `from → to` pair in the map must appear in `moduleDependsOn[from]`.

## Notes

- Only the **overview** page (`index.md`) is checked. Individual module pages are expected to *link* to the map rather than redraw it, so they are not parsed here.
- The spec intentionally skips edge labels outside the three context-map kinds (e.g. `mounts`), so those lines are silently ignored rather than causing a failure.
- If you add a new arrow type or relationship kind to the diagram, you must extend both `KIND_OF_ARROW` and the `EDGE` regex simultaneously, or the line will be silently dropped.
