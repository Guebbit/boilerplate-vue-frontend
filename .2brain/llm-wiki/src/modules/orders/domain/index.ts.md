---
source: src/modules/orders/domain/index.ts
sha256: 11fe36eaf7b8b9f02407986458862cc0412cb3021a64bb80d92452c0808bb9d5
generated_at: 2026-10-17T01:15:26.382899+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/index.ts

## Purpose

Barrel file for the Orders domain layer. It re-exports the pure business-rule functions and types defined in sibling modules so that consumers (views, components, tests) can import from a single entry point. The domain layer is intentionally free of Vue, Pinia, axios, and any other tier — a constraint enforced by lint rules.

## Key elements

- **`leftOutByReorder`** (from `./reorder`) — computes which order lines are excluded by a reorder operation.
- **`ReorderedOrderLine`** (type, from `./reorder`) — shape of a line affected by reordering.
- **`canHardDelete`** (from `./hard-delete`) — determines whether an order is eligible for hard deletion.
- **`HardDeletableOrder`** (type, from `./hard-delete`) — minimal order shape required by the deletion check.
- **`describeTimelineEntry`** (from `./timeline`) — produces a human-readable description for a timeline entry.
- **`isStaffOnly`** (from `./timeline`) — checks whether a timeline entry is restricted to staff.
- **`TIMELINE_AUDIENCE`** (from `./timeline`) — constant enumerating the audience options.
- **`TimelineAudience`, `TimelineLine`, `TimelineTools`** (types, from `./timeline`) — structural types for the timeline model.
- **`exportRefusalOf`** (from `./export-refusal`) — produces a refusal descriptor when an export is not permitted.
- **`ExportRefusal`** (type, from `./export-refusal`) — shape of an export-refusal result.

## Relationships

- **Re-exports** all symbols from `reorder.ts`, `hard-delete.ts`, `timeline.ts`, and `export-refusal.ts`. This file contains no logic of its own.
- **Consumed by** `Order.vue`, `OrdersList.vue`, and `OrderTimeline.vue`, which import domain rules and types through this barrel.
- **Tested via** `hard-delete-domain.spec.ts`, `reorder-domain.spec.ts`, and `timeline-domain.spec.ts`, which exercise the re-exported functions directly.

## Notes

- This is a pure re-export module — no side effects, no logic. Lint rules guarantee it (and its children) never import from the UI, state, or API tiers.
- When adding a new domain rule, create a dedicated file in `domain/` and add its exports here to keep the public surface explicit.
- `TIMELINE_AUDIENCE` is a value export (constant), not a type — import it as a value, not with `import type`.
