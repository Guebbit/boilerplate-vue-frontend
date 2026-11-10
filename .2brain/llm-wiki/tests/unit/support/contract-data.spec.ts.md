---
source: tests/unit/support/contract-data.spec.ts
sha256: 8672ff0d95febb74f4128f90863e4ebf4e8ffd75b99d61d8eafccf0a78bd364e
signature: 6f8cd94ebeea58b149fbeacc0a21850cc4b77a805cd7c41188ba5e5752ea9f4e
generated_at: 2026-11-10T08:23:27.680030+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/support/contract-data.spec.ts

## Purpose

Vitest suite that pins the `validPayload` / `invalidPayloads` helpers (Zod-driven payload generators) against a small, in-file schema. Because the schemas are hand-written here rather than imported from the real contract, a red test means the generator is broken, not that the API contract changed.

## Key elements

- **`SAMPLE_COUNT` (200)** – iteration count for statistical assertions (e.g., "all email shapes must appear").
- **`body`** – a `z.strictObject` with a bounded string, bounded number, two-value enum, defaulted boolean, and optional string. Serves as the primary fixture for both `validPayload` and `invalidPayloads` tests.
- **`describe('validPayload')`** – three tests:
  - Every draw round-trips through the schema's `safeParse`.
  - 200 email draws must collectively include a `+tag`, a long-TLD, and a subdomain shape.
  - A regex pattern with no known sample causes the generator to throw rather than emit an illegal value.
- **`describe('invalidPayloads')`** – three tests:
  - Each returned case violates exactly one field; `safeParse` rejects all of them.
  - Defaulted/optional fields are *not* reported as `"missing required field"`.
  - A `z.union` is walked branch-by-branch, producing invalid cases for every branch's distinct field.

## Relationships

- **`tests/support/unit/contract-data.ts`** – the only non-test dependency. This spec imports `validPayload` and `invalidPayloads` from it and exercises their correctness. No other files depend on this spec.

## Notes

- Schemas here are deliberately tiny and local; do not replace them with production schemas or the test loses its "generator-is-at-fault" guarantee.
- The email-rotation test is probabilistic in principle but uses 200 draws to make a miss astronomically unlikely; flakiness there points to a regression in the generator's email pool, not a test bug.
- The "missing required field" assertion hard-codes the expected field list (`count`, `kind`, `name`). Adding a required field to `body` without updating that list will break the test.
