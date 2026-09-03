# src/modules/cart/tests/store.spec.ts

## Purpose

Vitest unit-test suite for the Pinia cart store. It locks down three invariants the store is designed around: every mutating action replaces the local cart with the API's response (not a patch), `fetchSummary` treats only a 401 as "no cart" while letting other failures propagate, and `checkout` must let both API rejections and network-level errors reach the caller unmodified.

## Key elements

- **`CART`, `EMPTY_CART`, `ORDER`** – fixture constants used as the default mock payloads.
- **`apiFailure(status)`** – builds the rejection envelope (`{ success, status, message, errors[] }`) that the API layer's `onResponseReject` produces. Explicitly *not* an `Error` instance; this is the client's rejection contract.
- **`vi.mock('@api', …)`** – stubs all eight cart API functions (`getCart`, `getCartSummary`, `upsertCartItem`, `updateCartItemById`, `removeCartItem`, `clearCart`, `checkout`, `reorder`) to resolve the fixtures above. Individual tests override a single call with `mockReturnValueOnce` / `mockRejectedValueOnce`.
- **`describe('fetchSummary')`** – asserts the badge seeds from `summary.totalQuantity` (units, not lines), that a 401 yields an empty badge, and that a 500 rejects.
- **`describe('before anything is fetched')`** – confirms `cartItems` defaults to `[]` and summary is `undefined`.
- **`describe('updateCartItem')`** – includes a dedicated test that the store *replaces* its local cart with the recalculated response, catching implementations that fire-and-forget the reply.
- **`describe('clearCart')`** – asserts the call is bodyless (`toHaveBeenCalledWith()`), guarding the `DELETE /cart/all` vs `DELETE /cart/:productId` URL split.
- **`describe('checkout')`** – covers no-payload call, payload pass-through, local-cart clearing on success, propagation of API rejections (409), propagation of `Error('Network Error')`, and a 200 with an empty body (cart still cleared, no crash).
- **`describe('reorder')`** – verifies the order id is sent and the response (the updated cart) replaces local state.
- **`$id` test** – asserts the store is registered under the Pinia id `"cart"`.

## Relationships

No graph neighbors are recorded for this file. It imports `useCartStore` from `@/modules/cart/store` and the eight cart API functions from `@api`, both fully mocked via `vi.mock`.

## Notes

- **Rejection shape is intentional:** `apiFailure` returns a plain object, not an `Error`. The `eslint-disable` comment on that line is load-bearing—removing it would break the test's purpose of asserting the *envelope* passes through.
- **401 is special in `fetchSummary` only:** other endpoints treat all rejections as errors. The "guest has no cart" semantics are scoped to the summary endpoint the header badge reads.
- **Every mutation test asserts state *replacement*, not merge:** the suite repeatedly checks that `store.cart` equals the full mock response, not a patched version. This is the primary regression the suite guards against.
- **`vi.clearAllMocks()` in `beforeEach`** runs after `setActivePinia(createPinia())`; reordering those two lines would reset the mock factories before Pinia is wired up.
