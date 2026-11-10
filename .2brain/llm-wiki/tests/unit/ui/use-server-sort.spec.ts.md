---
source: tests/unit/ui/use-server-sort.spec.ts
sha256: e394e7d14916ba1f3f1f2ca747d76d6dce9c0eba2520be8d64c0c9536c994ce4
signature: b71cc499ad0b73bcef39812e9bab536e9f406ac682ef847157b00be7a9051dc8
generated_at: 2026-11-10T08:31:50.068626+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-server-sort.spec.ts

## Purpose

Unit tests for the `useServerSort` composable, verifying that a single `filters.sort` CSV is correctly exposed as two reactive editors (a table-header sort model and a select value) and that each editor writes back to the shared filter and triggers a re-search exactly once.

## Key elements

- **`setup(sort?)`** – Helper that creates a `filters` ref (with a fixed `text: 'oak'` and optional starting `sort`), a mocked `apply` function, and spreads the composable's return. Used by every test case.
- **"reads the stored CSV…"** – Asserts `sortBy` decodes `'-price'` into `[{ key: 'price', order: 'desc' }]` and `choice` holds the raw string.
- **"reads no sort as empty…"** – Asserts the zero-state: `sortBy` is `[]`, `choice` is `null`.
- **"stores a header click…"** – Sets `sortBy` to a new array, checks `filters.sort` is written, other filter keys are preserved, and `apply` is called once.
- **"removes the key…"** – Sets `sortBy` to `[]`; asserts the `sort` key is deleted from `filters` (not set to `''`) and `apply` fires.
- **"stores a select choice…"** – Sets `choice` to `'-price'` then back to `null`; asserts `apply` is called twice total and the key is removed on null.

## Notes

- Clearing the sort (via either editor) **deletes** the `sort` key from `filters` rather than storing an empty string; tests assert `'sort' in filters.value` is `false`.
- `apply` is always a `vi.fn()` mock; tests assert exact call counts to guard against double-firing.
- Both `sortBy` and `choice` are reactive projections of the same underlying `filters.sort` CSV — mutating one updates the filter, the other reflects it on next read.
