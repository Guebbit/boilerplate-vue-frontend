---
source: src/modules/orders/domain/index.ts
sha256: 7db750e9f73937e6c5b7438e1ec131664ad5281ebb596748854d8a572f42b73c
signature: 7db750e9f73937e6c5b7438e1ec131664ad5281ebb596748854d8a572f42b73c
generated_at: 2026-11-10T04:58:58.954483+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/index.ts

## Purpose

Barrel file for the orders domain layer. It re-exports the public API (functions and types) from the three sibling modules so that consumers can import domain logic from a single path (`@/modules/orders/domain`) without reaching into sub-files. The module is explicitly constrained—by lint rules—to contain no Vue, Pinia, or axios imports, keeping it pure and framework-agnostic.

## Key elements

- **`reorderOutcome`** — function re-exported from `./reorder`; computes the outcome of a reorder operation.
- **`ReorderedOrderLine`, `ReorderOutcome`** — types re-exported from `./reorder`.
- **`describeTimelineEntry`** — function re-exported from `./timeline`; produces a human-readable description for a timeline entry.
- **`OrderTimelineType`, `TimelineLine`, `TimelineTools`** — types re-exported from `./timeline`.
- **`exportRefusalOf`** — function re-exported from `./export-refusal`; determines whether an export should be refused and why.
- **`ExportRefusal`** — type re-exported from `./export-refusal`.

## Relationships

- **`src/modules/orders/domain/reorder.ts`**, **`src/modules/orders/domain/timeline.ts`**, **`src/modules/orders/domain/export-refusal.ts`** — the three modules whose values and types this barrel re-exports; the sole source of content in this file.
- **`src/modules/orders/tests/reorder-domain.spec.ts`**, **`src/modules/orders/tests/timeline-domain.spec.ts`** — test suites that exercise the re-exported functions (`reorderOutcome`, `describeTimelineEntry`) through this entry point.
- **`src/modules/orders/components/OrderTimeline.vue`**, **`src/modules/orders/views/OrderTarget.vue`**, **`src/modules/orders/views/OrdersList.vue`** — UI-layer consumers that import domain types/functions via this barrel rather than reaching into individual sub-modules.

## Notes

- This file contains **no logic**—it is purely a re-export surface. Behavior lives in the three sibling files.
- The lint-enforced "free of Vue, Pinia, axios and every tier" constraint means you cannot add framework imports here or in the re-exported modules without violating the architectural boundary. See `docs/theory/domain-layer.md` for the full rule.
- Adding a new domain module (e.g. `./cancel.ts`) requires a corresponding `export … from` line here to make it part of the public surface.
