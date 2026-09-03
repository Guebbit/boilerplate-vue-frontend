# src/modules/orders/tests/store.spec.ts

## Purpose

Unit tests for the `useOrdersStore` Pinia store. The `@api` client module is fully mocked so each store action is verified against canned envelope responses without hitting the network. Checkout is deliberately excluded—it belongs to `useCartStore` and is covered in `src/modules/cart/tests/store.spec.ts`.

## Key elements

- **`vi.mock('@api', …)`** — Replaces all eight order API functions (`listOrders`, `searchOrders`, `getOrderById`, `createOrder`, `updateOrderById`, `deleteOrderById`, `hardDeleteOrderById`, `getOrderInvoice`) with resolved promises returning fixture data.
- **`ORDER` / `EMPTY_PAGE` / `INVOICE`** — Fixtures. `EMPTY_PAGE` mirrors the real `PaginationMeta` shape (including `totalPages`) because `store.ts` reads that field. `INVOICE` is a raw `Blob`, the one endpoint that does not return a JSON envelope.
- **`describe('fetchOrders')`** — Asserts the store extracts `.items` from the paginated envelope.
- **`describe('fetchPaginationOrders')`** — Verifies default pagination (`page: 1, pageSize: 10`) and pass-through of explicit args; confirms it routes through `searchOrders`, not `listOrders`.
- **`describe('createOrder')` / `updateOrder`** — Verify payload forwarding and id-in-path / body-in-body splitting.
- **`describe('deleteOrder')` / `hardDeleteOrder`** — Two separate actions mapping to two separate client functions. Tests assert mutual exclusivity (soft does not call hard, and vice-versa) to guard against a shared-flag regression.
- **`describe('downloadInvoice')`** — Asserts the Blob is returned as-is, without envelope unwrapping.
- **`describe('fetchOrder')`** — Covers single-record unwrapping (`.data` vs `.data.items`), cache-key pass-through (second call hits cache), and `forced` cache bypass.
- **`describe('watchSearchOrders')`** — Validates filter forwarding, pagination inclusion in the search payload, and that failures reach the optional `onError` handler.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `setActivePinia(createPinia())` is called in `beforeEach`; tests rely on a fresh store instance each time rather than importing a shared one.
- `fetchOrder`'s cache-key test calls the action twice and asserts the API function was hit only once—this is the only way to confirm the id reaches the toolkit's cache layer, since a correct HTTP request would pass the first assertion regardless.
- `watchSearchOrders().search()` is a two-step call (configure, then trigger); tests chain them rather than using a watcher hook.
- The `searchOrders` mock resolves `EMPTY_PAGE`, so filter/pagination assertions rely on the *call arguments*, not the response shape.
