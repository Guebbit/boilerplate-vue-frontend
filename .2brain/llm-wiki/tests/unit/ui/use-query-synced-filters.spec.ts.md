---
source: tests/unit/ui/use-query-synced-filters.spec.ts
sha256: 37957348e579e22cda94f2b760cc5b313f82770aed42313f8c6206bf105b5948
generated_at: 2026-10-17T02:48:08.382644+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-query-synced-filters.spec.ts

## Purpose

Unit tests for the `useQuerySyncedFilters` composable (extracted from `WebhookDeliveries.vue`'s ad-hoc URL-query logic). Verifies that filters can be hydrated from a URL query on initial load and written back to the query on change, using a **real** `vue-router` instance with memory history rather than a mocked router.

## Key elements

- **`TestFilters`** — minimal synthetic shape (`status?: string`, `page: number`) exercising both a string and a numeric filter field.
- **`fromQuery`** — maps a `LocationQuery` into `TestFilters`; treats a missing/invalid `page` as `1`.
- **`toQuery`** — maps `TestFilters` back into a query object, **omitting** default values (`status` undefined, `page ≤ 1`) so the URL stays clean.
- **`Host`** — a one-line `defineComponent` wrapper that calls `useQuerySyncedFilters(fromQuery, toQuery)` in `setup()`; exists solely because the composable is not itself renderable.
- **`mountHost(query?)`** — helper that creates a router with `createMemoryHistory`, navigates to the given query *before* mounting `Host` (the composable reads `route.query` at call time), and returns `{ wrapper, router }`.
- **`describe("…— the initial read")`** (2 tests) — empty query yields defaults; a deep-link query hydrates correctly.
- **`describe("…— syncToQuery")`** (3 tests) — mirrors filters into the query; omits fields `toQuery` left out; uses `replace` (not `push`) so a filter change does not create a new history entry.

## Relationships

No graph neighbors are recorded. The file imports the unit under test from `@/ui/composables/use-query-synced-filters.ts` and depends on `vue-router`'s `createMemoryHistory` for realistic navigation.

## Notes

- The test deliberately avoids mocking the router; the comment explains that a mock would only prove `push`/`replace` is called, not that the resulting query is correct.
- `mountHost` must `await router.push(...)` **before** `mount(Host)`, because the composable captures `route.query` synchronously at call time.
- Async assertions use `vi.waitFor` (not a plain `expect`) because router state updates are microtask-async.
- The "replaces history" test inspects `router.options.history.state.position` directly to confirm no new entry was pushed.
