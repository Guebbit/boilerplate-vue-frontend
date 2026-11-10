---
source: src/modules/example/tests/publication.spec.ts
sha256: 35c3c56c055b0110c6d5de498572bbe1ef6505e709a833734f323a2c73659d91
signature: 35c3c56c055b0110c6d5de498572bbe1ef6505e709a833734f323a2c73659d91
generated_at: 2026-11-10T04:26:52.486474+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/publication.spec.ts

## Purpose

Exhaustive unit spec for the `publicationOf` helper (the template's single reading rule). Because the input space is small — three `ExampleStatus` values × `publishedAt` present or absent — the spec enumerates every combination via `it.each` rather than using property-based testing. It also pins two invariants: the `publishedAt` date alone must never read as "live", and the first-publish stamp is immutable across re-publishes.

## Key elements

- **`FIRST`** — a fixed ISO timestamp (`2026-01-01T00:00:00.000Z`) used as the canonical first-publish stamp across all cases.
- **`describe('publicationOf')`** — the sole top-level block; contains three tests:
  - `it.each(…)` — six named rows covering every (status, date-present/absent) pairing, asserting the exact `{ state, firstPublishedAt }` shape returned by `publicationOf`.
  - `'never reads the date alone as live'` — iterates every non-`published` status with `FIRST` set and asserts the resulting `.state` is not `'live'`.
  - `'keeps the first publish when an example is published again'` — confirms `firstPublishedAt` equals `FIRST` when status is `'published'` and the date matches the original stamp.

## Relationships

- **`src/modules/example/domain/index.ts`** — the barrel re-export that the spec imports via `import { publicationOf } from '../domain'`. The spec does not reach into the sub-module path directly.
- **`src/modules/example/domain/publication.ts`** — the implementation of `publicationOf` under test. All assertions in this file exercise that function's contract.

## Notes

- The `it.each` rows are typed with `as const`; the expected objects use either `firstPublishedAt: FIRST`, `firstPublishedAt: undefined`, or omit the key entirely (the `'never'` state). This distinction is intentional and must be preserved if cases are added.
- The "never reads the date alone as live" test filters `Object.values(ExampleStatus)` at runtime; adding a new enum member automatically extends this guard without touching the `it.each` matrix.
- The module docblock explicitly calls the date-only-trap the file "pins" — treat that test as load-bearing, not redundant with the table.
