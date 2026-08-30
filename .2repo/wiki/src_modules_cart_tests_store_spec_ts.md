# src/modules/cart/tests/store.spec.ts

## Purpose

Unit tests for the cart Pinia store (`useCartStore`). They lock in three behavioral contracts that types and e2e tests cannot catch: (1) a 401 from `getCartSummary` is the *only* status that means "no cart" (a 500 must still reject), (2) which actions emit analytics events and which do not, and (3) the checkout failure split — the client reports only network-level (status-less) failures, while the server reports all HTTP failures, preventing double-counted Umami rows.

## Key elements

- **`describe('useCartStore')`** — top-level suite; creates a fresh Pinia and clears all mocks in `beforeEach`.
- **`vi.mock('@api', …)`** — stubs all eight cart endpoints (`getCart`, `getCartSummary`, `upsertCartItem`, `updateCartItemById`, `removeCartItem`, `clearCart`, `checkout`, `reorder`) with default-resolving `CART` / `EMPTY_CART` / `ORDER` fixtures.
- **`vi.mock('@/infrastructure/stores/observability.ts', …)`** — replaces `useObservabilityStore` with a single `track` spy so analytics assertions are direct.
- **`apiFailure(status)`** — helper that builds the client's rejection envelope (`{ success, status, message, errors }`), *not* an `Error`, matching the real `onResponseReject` contract.
- **`describe('fetchSummary')`** — verifies badge seeding, 401 → `undefined` badge, 500 → re-thrown rejection.
- **`describe('before anything is fetched')`** — guards the header render path: `cartItems` is `[]`, `cart`/`cartSummary` are `undefined`.
- **`describe('updateCartItem')`** — asserts the product id goes in the path (not body), no analytics event fires, and the recalculated response *replaces* the local cart.
- **`describe('checkout')`** — the largest group; covers payload passthrough, cart emptying on success, 409 rejection *without* a client-side analytics call, status-less (`Error`) rejection *with* a `CHECKOUT_REQUEST_FAILED` event, and a 200-with-no-order envelope that must still resolve and clear the cart.
- **`describe('reorder')`** — confirms the order id is the sole argument and the response (the updated cart) replaces local state.

## Relationships

No graph neighbors are documented. The file imports `useCartStore` (under test), the eight `@api` endpoint functions (mocked), and `analyticsEvents` from the observability infrastructure (used in one assertion). All three are mocked or import-only; no other source files are touched.

## Notes

- The `apiFailure` helper intentionally rejects with a plain object, not an `Error`. An ESLint disable comment documents this as the client's rejection contract — do not "fix" it.
- The checkout analytics split is the subtlest part: a 409/4xx/5xx rejection must **not** call `track`; only a status-less rejection (network drop, CORS failure) calls `track(CHECKOUT_REQUEST_FAILED)`. Both tests exist to pin that boundary.
- `clearCart()` (no arg) and `clearCart('p1')` hit the same endpoint; the tests verify the API call argument (`undefined` vs `{ productId }`) but assert **no** analytics event for either variant at this layer.
- All assertions use `Promise.resolve`/`rejects` patterns rather than async/await, matching the store's promise-returning API and keeping the mock-call assertions in `.then()` callbacks.
