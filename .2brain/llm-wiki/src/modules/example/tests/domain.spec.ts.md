---
source: src/modules/example/tests/domain.spec.ts
sha256: 9eea38b67f8965187c9c12a1c508b750aa70e5219c716a3aca091f01bc5f0b1a
generated_at: 2026-10-17T00:52:01.968810+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/domain.spec.ts

## Purpose

Vitest spec that pins down the example-status lifecycle: the allowed transitions between statuses (`NEXT_STATUSES`) and the canonical display order (`EXAMPLE_STATUSES`). It exists so that any change to the state machine in the domain module is caught immediately in CI rather than discovered at runtime on a screen.

## Key elements

- **`describe('NEXT_STATUSES')`** — three `it` cases:
  - Parameterized (`it.each`) assertion of the exact outgoing array for each status: `draft → [published, archived]`, `published → [archived]`, `archived → [draft]`.
  - Loop over `EXAMPLE_STATUSES` asserting no status lists itself (no self-loops).
  - Explicit guard that `published` does **not** transition back to `draft` (one-way promotion rule).
- **`describe('EXAMPLE_STATUSES')`** — single assertion that the array equals `['draft', 'published', 'archived']`, locking the order a UI screen renders them.

## Relationships

- **Imports** `EXAMPLE_STATUSES` and `NEXT_STATUSES` from `../domain` (resolved to `src/modules/example/domain/index.ts`), which re-exports them from `src/modules/example/domain/statuses.ts`. The test is a leaf consumer: no other file imports this spec.
- The module doc comment in the spec ("mirror the API's own lifecycle … the server stays the judge") ties the transitions tested here to the server-side status endpoints; a contract change on the server side should be reflected in `statuses.ts` and will surface here.

## Notes

- The "no self-loop" and "no published→draft" tests overlap with the parameterized transition assertions; they are kept as separate named cases so a future change that accidentally *adds* a transition (rather than removing a valid one) is still caught by the explicit guard, even if someone updates the `it.each` table.
- `EXAMPLE_STATUSES` is asserted as an ordered array, not a set — reordering the export will break this test even if the set of values is unchanged.
