---
source: src/modules/cart/tests/store-interleavings.spec.ts
sha256: 4b27b94b667d791e601b4e8fb582c1f911935665fe14d74577d2293b967bd648
generated_at: 2026-10-17T00:43:14.074242+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-interleavings.spec.ts

## Purpose

Verifies the two invariants the cart store must maintain under interleaved (out-of-order) API responses: (1) the last answer to settle is the cart the store holds, and (2) any successful write to the basket invalidates a lost checkout attempt so the next checkout carries a fresh `Idempotency-Key`, while plain reads do not. It is the "two calls interacting" companion to `store.spec.ts`, which covers single-call behaviour.

## Key elements

- **`describe('answers that arrive in the order the requests left')`** — Parameterised control tests proving the harness delivers answers in the order instructed and that the final `store.cart` reflects the latest response. Also covers the "same person, refreshed record" case (session `viewer` email changes but the answer still applies).
- **`describe('the checkout attempt a write to the basket ends')`** — Parameterised over a `WRITES` list (add, update, remove, clear, setShipping, reorder, mergeGuestCart, seedAfterSignIn, successful checkout) asserting each one invalidates a lost checkout. Separate `it.each` blocks confirm `fetchCart`/`fetchSummary` do *not* invalidate it, and that a 422-rejected write does *not* invalidate it.
- **`lastKey()`** — Helper that extracts the `Idempotency-Key` header from the most recent `apiCheckout` call.
- **`SERVER_CART`** / **`freshStore()`** / **`disposeAll()`** — Shared fixture cart, store factory, and cleanup from `trackStores`.
- **`vi.mock('@api', …)`** — Replaces every cart API function with a `vi.fn()` so tests can control per-call answers via `mockResolvedValueOnce` / `mockRejectedValueOnce`.

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — Supplies `aCart` (build a cart from `[product, qty]` pairs), `answered` (wrap a value as a resolved store response), and `lostAnswer` (simulate a failed/lost checkout).
- **`tests/support/unit/cart-interleave.ts`** — Supplies `ACTIONS` (named action descriptors), `issue` (start an action, return a handle you can `.answer()` later), `signInAs`, and the `CartStore` type.
- **`tests/support/unit/track-stores.ts`** — Supplies `trackStores()`, which returns `{ fresh, disposeAll }` for creating and cleaning up Pinia store instances per test.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` connects the store's DI/module wiring so it resolves the mocked `@api` functions.
- **`tests/support/unit/fixtures.ts`** — Supplies `anOrder()` for the successful-checkout mock response.

## Notes

- The file header explicitly states that cases which *fail today* (e.g., an older answer overwriting a newer one, a previous person's answer leaking in) are **not** included. The suite only carries passing tests.
- The split with `store.spec.ts` is by concern: that file = "what one call does"; this file = "what two calls do to each other." Do not move single-call assertions here or vice-versa.
- The `WRITES` array is the canonical, enumerated list of actions that invalidate a lost checkout. If a new write action is added to the store, it must be added here or the invariant is untested.
- `issue(store, ACTIONS[name])` returns a handle with `.answer(value)` and `.settled`; the test controls *when* each answer resolves, which is the mechanism for simulating out-of-order delivery.
- `wireModulesIntoCore()` is called at module top level (once), not inside `beforeEach`.
