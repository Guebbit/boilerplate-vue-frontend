---
source: src/ui/composables/use-server-sort.ts
sha256: c9587ed5bca01fbab6a56b9a3469b4516d116f23471ced223b775fba6a6a4819
generated_at: 2026-10-17T01:57:32.984978+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-server-sort.ts

## Purpose
Binds a list page's `filters.sort` (a CSV string kept in the URL) to two editable UI controls — a table's `v-model:sort-by` and a plain `<select>` — and ensures that any change re-triggers the search from page 1, since the server re-sorts the entire result set.

## Key elements
- **`ServerSortOptions<TFilters>`** — Input interface: the reactive `filters` ref (any shape with an optional `sort` field) and the `apply` callback (typically `useListSearch().handleSearch`).
- **`ServerSort`** — Return interface: exposes `sortBy` (a `WritableComputedRef<SortByModel>` for the table) and `choice` (a `WritableComputedRef<string | null>` for the select).
- **`useServerSort<TFilters>()`** — The composable. Returns two writable computed refs that share a single internal `write` helper: it updates `filters.value.sort` (or deletes the key) and then calls `apply()`.
- **`write(csv: string | undefined)`** (internal) — Destructures the current filters, drops or sets `sort`, assigns back, and fires `apply()`. `undefined` results in the key being absent rather than an empty string.

## Relationships
- **`@/infrastructure/utils/sort.ts`** — Imports `csvFromSortBy` (model → CSV), `sortByFromCsv` (CSV → model), and the `SortByModel` type. These are the only serialization/deserialization helpers the composable depends on.
- No other graph neighbors.

## Notes
- Both `sortBy` and `choice` funnel through the same `write` call, so they are always in sync with `filters.sort`; there is no independent state.
- Setting `choice` to `null` or `sortBy` to a value that serializes to `undefined` *deletes* the `sort` key from the filters object (via destructuring), keeping the URL and outgoing request free of an empty `sort=` parameter.
- The generic constraint `TFilters extends { sort?: string }` means the composable works with any filter shape; the `as TFilters` cast after reassignment is required because destructuring an optional key narrows the type.
- `apply` is called as a fire-and-forget `void apply()`; callers are responsible for the search logic (pagination reset, request, etc.).
