# src/modules/orders/tests/store.spec.ts

## Purpose

Unit tests for the `useOrdersStore` Pinia store. The `@api` client module is mocked at the module level so each test asserts only on the store's own logic: which API function it calls, with what arguments, and how it unwraps (or doesn't unwrap) the response envelope.

## Key elements

- **`ORDER` / `INVOICE` fixtures** — canned API responses; `INVOICE` is a real `Blob` to exercise the binary-payload path.
- **`vi.mock('@api', …)`** — replaces every exported API function with a `vi.fn()` returning a resolved `Promise`. Tests override individual mocks (e.g. `mockRejectedValueOnce`) as needed.
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`) and clears all mocks between tests.
- **`describe` blocks** — one per store action: `fetchOrders`, `fetchPaginationOrders`, `createOrder`, `updateOrder`, `deleteOrder`, `hardDeleteOrder`, `downloadInvoice`, `fetchOrder`, `watchSearchOrders`.

## Relationships

No graph neighbors are recorded for this file. It imports `useOrdersStore` from `@/modules/orders/store` and the API functions from `@api`, but neither appears in the provided dependency graph.

## Notes

- **Soft vs. hard delete are separate methods, not a boolean flag.** The tests assert each reaches its *own* client function and that the other was *not* called—this is the core invariant the tests guard.
- **`downloadInvoice` returns a raw `Blob`, not a JSON envelope.** The store must not `.data`-unwrap it; the test asserts `result` is the exact same `Blob` reference.
- **`fetchOrder` cache-key test.** Calling `fetchOrder('o1')` twice and expecting only one API hit verifies the order id is passed as the cache key (second argument to `fetchTarget`), not just the URL parameter. A `{ forced: true }` option must bypass the cache.
- **Pagination defaults.** `fetchPaginationOrders` with no args must call `searchOrders` with `{ page: 1, pageSize: 10 }`.
- **`watchSearchOrders` includes pagination in the search payload.** The test explicitly asserts `page` and `pageSize` are present alongside filters to prevent a silent first-page-only regression.
- **Checkout is intentionally absent.** `POST /cart/checkout` lives in the cart store; see `src/modules/cart/tests/store.spec.ts`.
