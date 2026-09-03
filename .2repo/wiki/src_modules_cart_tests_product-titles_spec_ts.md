# src/modules/cart/tests/product-titles.spec.ts

## Purpose

Vitest spec for the cart store's product-title resolution. The cart and wishlist APIs return lines as bare product IDs; this file verifies that `useCartStore` maps those IDs to display titles with two guarantees: an unknown ID falls back to the ID string itself (never blank), and a single failed lookup does not corrupt the remaining results.

## Key elements

- **`vi.mock('@api', …)`** — File-scoped mock of `getProductById`. Resolves with `{ data: { id, title } }` for any ID except `'broken'`, which rejects with a 404-style error.
- **`beforeEach`** — Resets the Pinia instance and clears the mock's call log before every test.
- **`'answers the id itself while a title is unknown'`** — Asserts `store.titleOf('p1')` returns `'p1'` when no fetch has occurred yet.
- **`'resolves titles once per distinct id, and survives a failed lookup'`** — Calls `resolveTitles(['p1','broken','p1'])`; asserts `getProductById` was called exactly twice (dedup on `'p1'`), that `'p1'` resolves to its title, and that `'broken'` falls back to the raw ID.
- **`'does not refetch a title it already holds'`** — Calls `resolveTitles(['p1'])` then `resolveTitles(['p1','p2'])`; asserts only two total API calls, proving the first result is cached.

## Relationships

No graph neighbors are registered for this file. The two direct imports under test are `getProductById` from `@api` (mocked) and `useCartStore` from `@/modules/cart/store.ts` (the unit under test).

## Notes

- The `'broken'` string is a sentinel ID hard-coded into the mock factory; it is the only ID that triggers the rejection path.
- Assertions rely on `getProductById` call-count rather than inspecting internal store state, keeping the tests agnostic to caching implementation details.
- `resolveTitles` is expected to return a `Promise` (all three tests `.then` on it); a synchronous call would throw.
