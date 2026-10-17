---
source: src/modules/example/domain/index.ts
sha256: bcd3656214e50db4e7f94d9aa81a9fd2cc0c519897b653060eef3ebb7ed0c95d
generated_at: 2026-10-17T00:50:39.920730+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/domain/index.ts

## Purpose

Barrel file for the `example` module's domain layer. It re-exports the module's pure domain rules (status constants) so that screens, schemas, and tests can import from a single, stable path (`domain`) rather than reaching into individual implementation files.

## Key elements

- **`EXAMPLE_STATUSES`** (re-export from `./statuses`) — the set of status values the example entity can have.
- **`NEXT_STATUSES`** (re-export from `./statuses`) — the allowed status-to-status transitions, likely used to drive UI actions and validation.

## Relationships

- **`domain/statuses.ts`** — sole source of the re-exports; all domain status data lives there.
- **`schemas.ts`** — consumes the exports (per the module doc comment) to attach status validation to form/DTO schemas.
- **`views/ExamplesList.vue`**, **`views/ExampleEdit.vue`** — the "screens" referenced in the module doc; import status constants from this barrel for rendering and state logic.
- **`components/ExampleStatusActions.vue`** — UI component that relies on the status/transition data surfaced through this barrel.
- **`tests/domain.spec.ts`** — exercises the domain exports (and `statuses.ts` behind them) as integration/unit tests for the module's rules.

## Notes

- This file intentionally contains **no logic** — only re-exports. Add new domain exports here to keep the public surface of `domain` flat.
- The JSDoc `@module` tag marks this as the canonical import point; prefer importing from `domain` (i.e., this file) over deep-importing `domain/statuses` directly, so internal refactors don't break consumers.
