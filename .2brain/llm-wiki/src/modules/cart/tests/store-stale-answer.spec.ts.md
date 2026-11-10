---
source: src/modules/cart/tests/store-stale-answer.spec.ts
sha256: 7566a19377c9af60253914195161152549b7c6e0bfc24bcbfb6d3283061a51bb
signature: 6f6fd05926b26c6c100c37b553956bd50bcb2d395023146cff9bf555a7e594a5
generated_at: 2026-11-10T04:11:16.490654+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-stale-answer.spec.ts

## Purpose

Verifies that the cart Pinia store always ends up showing the answer to the **last** request issued, even when the network delivers earlier responses after later ones. Complements `store-interleavings.spec.ts` (the in-order control) by exercising the out-of-order path.

## Key elements

- **`it.each` table (6 pairs)** — Issues two actions via `issue(store, ACTIONS[name])`, resolves the *second* (newer) answer first, then the *first* (older) one, and asserts `store.cart` equals the newer answer. Covers add/update, update/updateOther, read/update, shipping/read, update/remove, update/clear.
- **Property-based three-write test** — Uses `fast-check`'s `fc.scheduler` to enumerate every interleaving of three writes (add → update → remove); asserts the final cart is always the third answer. Seeded (`20_261_004`) for reproducibility.
- **Checkout late-step test** — Confirms that a quantity step answered *after* `checkout()` has already resolved does not resurrect cart items; `store.cartItems` stays empty.
- **`freshStore` / `disposeAll`** — Obtained from `trackStores()`; each test gets an isolated store, `afterEach` disposes them all.
- **`wireModulesIntoCore()`** — Called once at module scope to inject the store's module-level dependencies before any test runs.
- **`vi.mock('@api', …)`** — Stubs every cart API function so tests control resolution timing exclusively via gates.

## Relationships

- **`cart-fixtures.ts`** — Imports `aCart` to build cart payloads with specific product/quantity pairs.
- **`cart-interleave.ts`** — Imports `ACTIONS` (the named action descriptors) and `issue()` (issues an action, returns a `gate` the test resolves manually).
- **`track-stores.ts`** — Imports `trackStores()` for lifecycle-managed store instances.
- **`tests/support/unit/async-answers.ts`** — Imports `gate`, `answered`, and the `Answer` type used to model controllable async resolutions.
- **`tests/support/unit/fixtures.ts`** — Imports `anOrder` for the checkout-resolved order payload.
- **`tests/support/unit/wire-modules.ts`** — Imports `wireModulesIntoCore` to satisfy the store's constructor-level module wiring.

## Notes

- The sibling `store-interleavings.spec.ts` is referenced in the file docblock as the in-order counterpart; keep them in sync when adding new action pairs.
- The property test creates a **fresh Pinia** inside the scheduler callback (not the shared `beforeEach`), because the scheduler replays the property multiple times.
- The fixed seed (`20_261_004`) is intentional — changing it will alter which interleavings are exercised.
- `wireModulesIntoCore()` runs at import time, not per-test; if it is made non-idempotent in the future, this file will break.
