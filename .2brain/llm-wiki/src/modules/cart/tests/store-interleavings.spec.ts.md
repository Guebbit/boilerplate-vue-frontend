---
source: src/modules/cart/tests/store-interleavings.spec.ts
sha256: 1ce0b1abbf5d2b2fa8ff02e315cd656a052f139972402a3feaa3f0683cbbd0cd
signature: 9bf4bbec7763c4f2d5907925774d1ab9ca65446540400162ac78544782ff93a8
generated_at: 2026-11-10T04:10:49.484837+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-interleavings.spec.ts

## Purpose

Tests the interleavings (two-call interactions) of the cart store: that answers are applied in request order, that a late answer for the same viewer is still applied, and that any successful basket-write invalidates a pending checkout attempt (new idempotency key) while plain reads do not. It is the companion to `store.spec.ts`, which covers single-call behavior; this file covers what two calls do *to each other*.

## Key elements

- **`SERVER_CART`** — default mock response (`aCart([['p1', 2]])`) for all API reads/writes unless a case overrides.
- **`freshStore()` / `disposeAll()`** — from `trackStores`; creates a fresh Pinia-backed store per test and disposes all in `afterEach`.
- **`lastKey()`** — inspects the `Idempotency-Key` header of the most recent `apiCheckout` call to assert attempt identity.
- **`beforeEach`** — resets mocks, sets active Pinia, and wires every `@api` function to resolve with `SERVER_CART`.
- **`it.each` (in-order block)** — six named action pairs (add→update, update→updateOther, read→update, shipping→read, update→remove, update→clear) that verify the *second* answer wins when delivered sequentially.
- **Same-person late-answer test** — mutates `session.viewer` (same person, new email) and confirms a still-pending read still lands in the store.
- **`WRITES` array** — exhaustive list of 9 actions (add, update, remove, clear, setShipping, reorder, mergeGuest, seedAfterSignIn, checkout) that must invalidate a lost checkout attempt.
- **Reads-left-alive tests** — `fetchCart` and `fetchSummary` do *not* change the idempotency key (same attempt).
- **Basket-changed read test** — a read that returns a *different* cart does invalidate the attempt.
- **Refused-write test** — a 422 on `addCartItem` leaves the attempt intact (nothing changed server-side).

## Relationships

- **`src/modules/cart/tests/cart-fixtures.ts`** — imports `aCart` to build inline cart fixtures.
- **`src/modules/cart/tests/cart-interleave.ts`** — imports the interleaving harness: `ACTIONS` (named action thunks), `issue` (returns `{ answer, settled }`), `signInAs`, and the `CartStore` type. All multi-call tests are built on this.
- **`src/modules/cart/tests/track-stores.ts`** — imports `trackStores` to get `fresh` / `disposeAll` for Pinia lifecycle per test.
- **`tests/support/unit/async-answers.ts`** — imports `answered` (wraps a value in a resolvable promise) and `lostAnswer` (a never-resolving / rejected promise) to control answer timing.
- **`tests/support/unit/fixtures.ts`** — imports `anOrder` for the default checkout success payload.
- **`tests/support/unit/wire-modules.ts`** — imports and calls `wireModulesIntoCore()` once at module level so the Pinia store's internal module references are available.

## Notes

- The file explicitly documents (in the module doc-comment) that cases where the invariant does **not** hold today are deliberately absent — "a test that fails is not a test the suite may carry." Do not add known-failing interleaving cases here; they belong in a separate tracking mechanism.
- `vi.mock('@api')` is hoisted above all imports; the `beforeEach` then re-points each mock to `SERVER_CART` after `vi.resetAllMocks()`.
- The `signInAs` helper from `cart-interleave.ts` is used only in the same-person test; the interleaving harness assumes a viewer is set before `issue` is called in most cases.
- `wireModulesIntoCore()` is called at top level (not in `beforeEach`) because it patches module-level bindings once; calling it repeatedly would be redundant.
