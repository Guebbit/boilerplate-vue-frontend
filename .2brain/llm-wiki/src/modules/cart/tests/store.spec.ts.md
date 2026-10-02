---
source: src/modules/cart/tests/store.spec.ts
sha256: fef0a375f32a4b0ff613758ab33b49a48cb012fd4e284b568c4c8caeab83312f
generated_at: 2026-10-02T15:02:59.992537+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store.spec.ts

## Purpose

Unit tests for the cart Pinia store (`useCartStore`). The file guards three invariants called out in the module docblock: (1) `clearCart` and `removeCartItem` hit distinct `DELETE` URLs rather than one overloaded endpoint, (2) summary getters must not throw when no cart has been fetched yet, and (3) `checkout` must surface both success and failure envelopes so a backend rejection is not silently treated as an abandoned funnel.

## Key elements

- **`RESPONSES`** — object of canned API responses, each wrapped in `contractResponse(schemas.<Op>Response, payload)` so any drift from the generated Orval schema fails the entire file.
- **`CART` / `EMPTY_CART` / `ORDER`** — the three primary fixtures (one-line cart, emptied cart, and the order checkout creates).
- **`apiFailure(status)`** — builds the rejection *envelope* (plain object with `success: false`, `status`, `errors[]`) that `onResponseReject` produces; deliberately not an `Error` instance.
- **`lastIdempotencyKey()`** — inspects the most recent `apiCheckout` mock call to read the `Idempotency-Key` header (referenced as "B19").
- **`signInAs(id?)`** — writes a viewer into the session store and returns `nextTick()`, since the store's watcher reads `viewer.id` directly.
- **`vi.mock('@api', …)`** — factory mock stubbing every cart API function to resolve the corresponding `RESPONSES` entry; also stubs `getProductById`.
- **`describe` blocks** — one per store action (`fetchSummary`, initial state, `fetchCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `setShippingMethod`, `checkout`). Each asserts both the outgoing request shape and the resulting store state.
- **`beforeEach`** — creates a fresh Pinia instance and clears all mocks.

## Relationships

- **`tests/support/unit/fixtures.ts`** — supplies the `anOrder` factory used to build the `ORDER` fixture with consistent totals.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractResponse`, the wrapper that deep-validates each canned payload against its generated response schema before the test can use it.

## Notes

- Rejection fixtures use a plain object, not `new Error(...)`, because the client's `onResponseReject` contract returns a structured envelope. The `eslint-disable` comment marks this intentionally.
- `fetchSummary` treats **401 only** as "no cart" (guest). A 500 must reject so the UI doesn't display a full cart as empty. Tests cover both paths explicitly.
- `updateCartItem` has a dedicated test asserting the store *replaces* its local cart with the response, catching implementations that fire the request but discard the recalculated totals.
- `setShippingMethod(null)` must send `shippingMethodId: null` (not `undefined` or omit the key), verified by an exact `toHaveBeenCalledWith` match.
- The file is truncated in the provided content; the `checkout` describe block (idempotency-key checks, failure-envelope propagation) and any `reorder` tests are implied but not fully visible.
