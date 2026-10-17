---
source: tests/unit/ui/use-server-sort.spec.ts
sha256: e394e7d14916ba1f3f1f2ca747d76d6dce9c0eba2520be8d64c0c9536c994ce4
generated_at: 2026-10-17T02:48:16.127085+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-server-sort.spec.ts

## Purpose

Unit tests for the `useServerSort` composable, verifying that a single `filters.sort` CSV string is correctly read into and written back from two UI bindings (a table-header sort model and a select dropdown value), and that each write triggers exactly one re-search from page 1 while preserving other filters.

## Key elements

- **`setup(sort?)`** — local helper that creates a `filters` ref (with an optional pre-set `sort` and a `text` filter), a mocked `apply` function, and spreads the result of `useServerSort({ filters, apply })`. Every test calls this to get an isolated instance.
- **Test: "reads the stored CSV as a table model and as a select value"** — asserts that an existing `-price` sort yields `sortBy: [{ key: 'price', order: 'desc' }]` and `choice: '-price'`.
- **Test: "reads no sort as an empty table model and a null choice"** — asserts the no-sort defaults: `sortBy: []`, `choice: null`.
- **Test: "stores a header click, keeps the other filters, and re-searches once"** — sets `sortBy` to a new value, confirms `filters.sort` is written, `filters.text` is untouched, and `apply` was called exactly once.
- **Test: "removes the key, rather than store an empty one, when the sort is cleared"** — sets `sortBy` to `[]`, confirms the `sort` property is fully deleted from `filters` (not set to `''`), and `apply` fires once.
- **Test: "stores a select choice, and treats null as the default order"** — sets `choice` to `'-price'` then to `null`, confirming the `sort` key is added then removed, and `apply` was called twice total.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports the SUT from `@/ui/composables/use-server-sort.ts` and uses `vue` (`ref`) and `vitest` as standard test dependencies.

## Notes

- The tests use `vi.fn()` for `apply` and assert call counts (`toHaveBeenCalledTimes`) to enforce the "re-searches once per change" contract.
- Clearing the sort is verified to *delete* the `sort` key from the filters object (`'sort' in filters.value === false`) rather than leaving an empty string — a deliberate choice that downstream serialization or URL-param logic may depend on.
- The composable is exercised entirely through its two public bindings (`sortBy`, `choice`); no internal state is inspected directly.
