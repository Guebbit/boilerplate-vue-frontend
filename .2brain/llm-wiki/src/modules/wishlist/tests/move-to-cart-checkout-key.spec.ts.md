---
source: src/modules/wishlist/tests/move-to-cart-checkout-key.spec.ts
sha256: dad0b6f32b2e74bd5ddb73f16c9d85332a7e9ebebdc69d230a217cbb5b4871f2
generated_at: 2026-10-17T01:55:10.210757+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/move-to-cart-checkout-key.spec.ts

## Purpose

Verifies that moving a product from the wishlist into the cart invalidates any prior checkout attempt: the next `POST /cart/checkout` must carry a **new** `Idempotency-Key` because the cart's fingerprint (the basis of the key) has changed. Without this, the server could replay the lost attempt's order against a now-different basket.

## Key elements

- **`lastCheckoutKey()`** — Walks `orvalMutator`'s mock call history (via `findLast`) to extract the `Idempotency-Key` header from the most recent checkout request. The key travels in the mutator's *second* argument (per-call options), not in the request config.
- **`checkoutsToLose`** / **`cartReads`** — Module-level counters that let the single `orvalMutator` mock return different payloads across successive calls within one test.
- **`vi.mock('@/infrastructure/http')`** — Replaces the transport seam. Routes on `METHOD url`: rejects `POST /cart/checkout` for the first N calls (simulating a lost answer), returns a 1-unit cart on the first `GET /cart` and a 2-unit cart thereafter, and accepts `POST /wishlist/p1/move-to-cart`.
- **The single test** (`'ends the checkout attempt whose answer was lost…'`) — Fetches cart, forces one failed checkout, captures its key, performs `moveToCart('p1')`, retries checkout, and asserts the new key differs from the lost one.

## Relationships

- **`src/modules/wishlist/store.ts`** — `useWishlistStore().moveToCart('p1')` is the action under test.
- **`src/infrastructure/http/index.ts`** — Provides `orvalMutator`, the sole mock seam; all HTTP traffic in the test flows through this function.
- **`tests/support/unit/cart-fixtures.ts`** — Supplies `aCart(items)` (shaped cart payload) and `lostAnswer()` (the rejection value).
- **`tests/support/unit/fixtures.ts`** — Supplies `anOrder()` (the successful checkout response body).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the cart and wishlist stores into the application's core before any test runs.

## Notes

- The mock differentiates `GET /cart` responses by read count (first call → 1 unit, later calls → 2 units) to simulate the cart gaining the moved item. This is an artificial state transition, not a real store mutation.
- `sessionStorage.clear()` in `beforeEach` resets any persisted checkout-attempt state that may carry the old key.
- The key derivation logic lives in `cart/domain/checkout-attempt.ts` (referenced in the header comment); this spec only asserts the observable header change, not the fingerprint algorithm.
