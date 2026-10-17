---
source: src/modules/cart/tests/store-stale-answer.spec.ts
sha256: 0c8ab351ffeb0bf7aa8a4e9e18c9659030a19327f85ed12c30b2530cab1ca503
generated_at: 2026-10-17T00:43:40.998156+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-stale-answer.spec.ts

## Purpose

Verifies that the cart store discards out-of-order (stale) API responses: when multiple writes are in flight, the store must always settle on the answer to the **last** request issued, no matter which order the network delivers the responses. Serves as the adversarial counterpart to `store-interleavings.spec.ts`, which covers the same action pairs delivered in order.

## Key elements

- **`describe('answers that arrive in the wrong order')`** — top-level suite containing all stale-answer scenarios.
- **`it.each` table (6 pairs)** — for each pair `(first, second)` from `ACTIONS`, issues `first` then `second`, answers `second` first, then answers `first`; asserts `store.cart` equals the newer cart. Pairs cover add→update, update→updateOther, read→update, shipping→read, update→remove, update→clear.
- **Property-based test (`fc.scheduler`)** — issues three consecutive writes (add, update, remove) under a fast-check scheduler that permutes delivery order. Asserts the final state matches the third (last) write's answer. Uses a fixed seed (`20_261_004`) and 50 runs for reproducibility.
- **Checkout-with-late-step test** — starts a checkout, lets it resolve, then delivers a stale `update` answer afterward; asserts `store.cartItems` stays empty.
- **`vi.mock('@api')`** — stubs every cart API function so tests control response timing and content.
- **`wireModulesIntoCore()`** — called once at module level to register cart modules with the core runtime before any test runs.
- **`beforeEach` / `afterEach`** — resets Pinia, localStorage, and mocks; disposes tracked stores via `disposeAll()`.

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — imports `aCart`, `gate`, `answered`, and the `Answer` type; `aCart` builds fixture cart payloads, `gate` creates a manual resolve/await pair for controlling answer timing, `answered` wraps a value in the API's `Answer` envelope.
- **`tests/support/unit/cart-interleave.ts`** — imports `ACTIONS` (a record mapping action names like `'add'`, `'update'`, `'remove'`, `'clear'`, `'shipping'`, `'updateOther'` to store-action invokers) and `issue` (executes an action and returns a handle with `.answer()` and `.settled`).
- **`tests/support/unit/fixtures.ts`** — imports `anOrder` to build the checkout response fixture.
- **`tests/support/unit/track-stores.ts`** — imports `trackStores` to obtain `fresh` (create a store under test) and `disposeAll` (clean up in `afterEach`).
- **`tests/support/unit/wire-modules.ts`** — imports `wireModulesIntoCore` to register cart feature modules into the app's module graph so store actions resolve against real (mock-backed) dependencies.

## Notes

- The `@api` mock includes functions the tests never call (`getCartSummary`, `clearCart`, `mergeCart`, `setCartShippingMethod`, `reorder`); they exist to satisfy the module's full export surface.
- The property-based test calls `setActivePinia(createPinia())` **inside** `fc.asyncProperty`, overriding the `beforeEach` pinia, so each scheduler run gets its own store context.
- `endOnFailure: true` on the property test means a single failing permutation aborts the remaining 49 runs.
- The checkout test uses `vi.waitFor` rather than a plain `await` to poll for the mock call, because `store.checkout()` is fire-and-forget (the returned promise is caught with `.catch(() => undefined)`).
