---
source: src/ui/composables/use-server-sort.ts
sha256: c9587ed5bca01fbab6a56b9a3469b4516d116f23471ced223b775fba6a6a4819
signature: 9b14c9cb197f0141f0129215e8527f5d2b71b82e3ef9b942793f92cb4b8ba3e6
generated_at: 2026-11-10T06:25:23.693068+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-server-sort.ts

## Purpose
Binds a list page's `filters.sort` (a CSV string that lives in the URL) to two UI controls — a table's `v-model:sort-by` and a plain `<select>` — so that editing either one updates the store and immediately re-runs the search from page 1.

## Key elements
- **`useServerSort<TFilters>()`** — the composable. Accepts `{ filters, apply }` and returns `{ sortBy, choice }`.
- **`sortBy: WritableComputedRef<SortByModel>`** — wired to a table's `v-model:sort-by`. Reads via `sortByFromCsv`, writes via `csvFromSortBy` + `write`.
- **`choice: WritableComputedRef<string | null>`** — wired to a `<select>`. Raw CSV in, `null` represents "default order"; writes go through the same `write` path.
- **`ServerSortOptions<TFilters>`** / **`ServerSort`** — the input/output type contracts.
- **`write(csv)`** (internal) — mutates `filters.value.sort` (or deletes the key when `csv` is `undefined`) and calls the page's `apply()` to restart the search.

## Notes
- Setting either model always triggers a full re-search (page reset). This is intentional: the server re-sorts the entire result set, so the previous page number is meaningless.
- When the user clears the sort, `write` receives `undefined` and *deletes* the `sort` key from the filters object rather than storing an empty string, keeping the URL and query params clean (no `sort=`).
- The `as TFilters` cast after destructuring `sort` out is a type-narrowing workaround; at runtime the object shape is unchanged.
- The composable is generic over the filters object (`TFilters extends { sort?: string }`), so it works with any store shape that carries an optional `sort` field.
