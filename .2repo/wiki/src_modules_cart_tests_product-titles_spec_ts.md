# src/modules/cart/tests/product-titles.spec.ts

## Purpose

Vitest suite for the cart store's product-title join (`titleOf` / `resolveTitles`). It guards two invariants the cart and wishlist pages depend on: an unknown id is rendered as itself (never blank), and a single failed API lookup must not prevent the remaining ids from resolving.

## Key elements

- **`vi.mock('@api')`** — Replaces `getProductById` with a deterministic stub: id `'broken'` rejects with a 404; every other id resolves to `{ data: { id, title: "Title of <id>" } }`.
- **`vi.mock('@/infrastructure/stores/observability.ts')`** — Silences the observability store so it has no side effects during tests.
- **`describe('useCartStore — product titles')`** — The test block; calls `setActivePinia(createPinia())` and `mockClear()` in `beforeEach` for isolation.
- **`it('answers the id itself while a title is unknown')`** — Asserts `titleOf('p1')` returns `'p1'` before any resolution has occurred.
- **`it('resolves titles once per distinct id, and survives a failed lookup')`** — Passes `['p1', 'broken', 'p1']`; asserts `getProductById` is called exactly twice (dedup) and that `titleOf('broken')` still yields `'broken'` while `titleOf('p1')` yields the resolved title.
- **`it('does not refetch a title it already holds')`** — Calls `resolveTitles` twice; asserts the total API calls are 2 (p1 fetched once, p2 once), confirming caching across invocations.

## Relationships

No graph neighbors are recorded for this file. It imports `useCartStore` from `@/modules/cart/store.ts` and `getProductById` from `@api`, but those are mocked out entirely for the test.

## Notes

- The `'broken'` sentinel is a magic string baked into the mock; any test that introduces a new id will implicitly pass the resolve branch. Use a different id if you need a second failure case.
- Tests are async and rely on the returned promise from `resolveTitles`; forgetting to `return` the chain will make Vitest report a pass without asserting.
- `mockClear()` (not `mockReset()`) is used, so the factory implementation set in `vi.mock` persists across tests.
