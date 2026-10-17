---
source: tests/unit/ui/use-list-url-state.spec.ts
sha256: 92af82bdfa88837a0e5afe9d7de768ffbca44818bfffee7556ee966ff200afb1
generated_at: 2026-10-17T02:47:55.669650+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-list-url-state.spec.ts

## Purpose

Unit tests for the two list-page composables (`useListUrlState` and `useListSearch`) and the `parseUrlParameter` helper they rely on. The suite drives them through a real `vue-router` instance backed by `createMemoryHistory` so that the query strings read and written are the same ones a production navigation would carry.

## Key elements

- **`TestFilters`** – local interface with one field per parameter kind (`string`, `number`, `boolean`, enum) used to exercise every code path.
- **`mountList(query, stored)`** – helper that creates fresh `ref`s for `filters`/`page`/`pageSize`, wires both composables inside a `defineComponent` host, pushes the given `query` onto a memory-history router, then mounts and returns `{ wrapper, router, filters, page, pageSize, search }`.
- **`mountTwoLists(query)`** – helper that mounts a single host containing *two* `useListUrlState` instances with distinct `prefix` values (`'one'`, `'two'`) to verify key isolation.
- **`describe('parseUrlParameter')`** – table-driven checks for string/number/boolean parsing, empty-string → `undefined`, invalid values → `undefined`, and closed-set (enum) membership.
- **`describe('useListUrlState — the load')`** – verifies that on mount the composable overwrites stored refs with valid deep-link values, leaves them untouched when no keys match, and discards invalid values.
- **`describe('useListUrlState — sync')`** – verifies `sync()` writes only non-empty filters and a page past 1, that page/pageSize changes auto-sync, and that query keys not owned by the page (e.g. `utm`) are preserved.
- **`describe('useListUrlState — prefix')`** – confirms each prefixed instance reads and writes only its own `prefix-`-keyed query params without clobbering the other.
- **`describe('useListSearch')`** – confirms `handleSearch` resets page to 1, syncs the URL, and calls `search()`; confirms `handleReset` clears all filters, resets page, and calls `search(true)` to bypass cache.

## Relationships

- Imports and exercises `parseUrlParameter`, `useListUrlState` from `@/ui/composables/use-list-url-state.ts`.
- Imports and exercises `useListSearch` from `@/ui/composables/use-list-search.ts`.

## Notes

- Async assertions use `vi.waitFor` (polling) rather than a fixed delay, because `router.push` and Vue reactivity flushes are timing-sensitive under the memory-history setup.
- The `search` spy is typed as `_force?: boolean` to match the composable's optional "bypass cache" parameter; tests assert it is called with no argument vs. `true` to distinguish search from reset.
- The two-list prefix tests intentionally mount both instances in the *same* component so they share a single router and can verify they don't overwrite each other's query keys.
