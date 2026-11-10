---
source: tests/unit/ui/use-list-url-state.spec.ts
sha256: 92af82bdfa88837a0e5afe9d7de768ffbca44818bfffee7556ee966ff200afb1
signature: b0b4c5a8498a1b85eec079e1420689b8ffeffac85341d408b3b4296c1baf3056
generated_at: 2026-11-10T08:30:56.996993+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-list-url-state.spec.ts

## Purpose

Unit tests for the `useListUrlState` and `useListSearch` composables. Verifies that list-page filters, page number, and page size are correctly read from and written to URL query parameters, that invalid values are dropped, that prefixed keys isolate multiple lists, and that search/reset handlers behave as expected. Uses a real `vue-router` with `createMemoryHistory` so the query assertions match actual navigation payloads.

## Key elements

- **`TestFilters`** — local interface with one field per supported kind (`string`, `number`, `boolean`, closed-set) used to type the synthetic store state.
- **`mountList(query, stored?)`** — mounts a host component that wires `useListUrlState` + `useListSearch` to fresh refs. Pushes `query` onto a memory-history router *before* mounting, simulating a deep-link arrival. Returns the wrapper, router, and refs.
- **`parseUrlParameter` tests** — parameterized (`it.each`) checks for string, number, boolean, and closed-set parsing, including rejection of empty strings and invalid values.
- **`useListUrlState — the load`** — confirms the store is untouched when the URL names no known params, that a valid deep link fully replaces filters/page/pageSize, and that invalid values are dropped rather than forwarded.
- **`useListUrlState — sync`** — verifies `sync()` writes only populated filters and a page > 1, auto-writes page and pageSize changes reactively, and preserves query keys the page does not own (e.g. `utm`).
- **`mountTwoLists(query)`** — mounts two `useListUrlState` instances with distinct `prefix` values on one router.
- **`useListUrlState — prefix`** — confirms each list reads only its own prefixed keys and that syncing one list leaves the other's keys intact.
- **`useListSearch` tests** — `handleSearch` resets page to 1, syncs the URL, then calls `search()`; `handleReset` clears all filters, resets page, and calls `search(true)` (forced fetch).

## Relationships

No graph neighbors are recorded for this file in the dependency graph. It imports `parseUrlParameter` and `useListUrlState` from `@/ui/composables/use-list-url-state.ts` and `useListSearch` from `@/ui/composables/use-list-search.ts`, as well as `vue-router` and `@vue/test-utils`, but these edges are not tracked in the graph.

## Notes

- The `stored` argument to `mountList` simulates a pre-existing store state (e.g. from a previous visit) to verify that a deep link *replaces* it rather than merging.
- Assertions on router query use `vi.waitFor` because `sync()` is reactive/async; plain synchronous `expect` would miss the write.
- The `prefix` feature (tested via `mountTwoLists`) names query keys as `"{prefix}-{param}"`; without a prefix the key is just the param name.
- `handleReset` passes `true` to `search` to bypass caching — distinct from `handleSearch` which calls `search()` with no argument.
