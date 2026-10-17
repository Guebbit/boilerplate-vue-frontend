---
source: src/modules/wishlist/tests/store-ordering.spec.ts
sha256: 112d3b61ad625941b90836fc9da5827cba88f0f960757f661b1bab1926940347
generated_at: 2026-10-17T01:55:27.893987+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/store-ordering.spec.ts

## Purpose

Verifies that the wishlist store correctly handles out-of-order API responses (a later write's answer wins regardless of arrival order) and that an in-flight response belonging to a previous viewer is discarded when the session changes. It mirrors the ticket-ordering guarantees already tested for the cart store.

## Key elements

- **`answer(...ids)`** – Local helper that builds a resolved API envelope containing the given product IDs (each with `availability: 'in_stock'`), using the `answered` utility from `cart-fixtures.ts`.
- **`signInAs(id?)`** – Sets the session store's `viewer` (or clears it) and returns `nextTick()` so Pinia watchers fire before assertions run.
- **`describe('answers that arrive in the wrong order')`** – Issues `addToWishlist` then `removeWishlist`, resolves the *newer* gate first and the *older* gate second, and asserts the store reflects the later write.
- **`describe('an answer for the person who is gone')`** – Starts a `fetchWishlist` call under viewer "a", switches to viewer "b", then resolves the stale gate; asserts `store.items` is empty.
- **`vi.mock('@api', …)`** – Spreads the real module and overrides `getWishlist`, `addWishlistItem`, and `removeWishlistItem` with `vi.fn()` stubs.
- **`wireModulesIntoCore()`** – Called at module scope (before any test) to register the wishlist module with the app's module registry so the store's watchers are active.

## Relationships

- **`src/modules/wishlist/store.ts`** – The store under test; the spec exercises `addToWishlist`, `removeFromWishlist`, and `fetchWishlist` and reads `store.items`.
- **`tests/support/unit/cart-fixtures.ts`** – Provides the `gate` / `answered` / `Answer` primitives used to control promise resolution order and shape mock responses.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, which the spec calls once at import time to make stores functional outside a full app.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** – Sibling test that enforces the same ticket-ordering rule for the cart store; this spec is the wishlist analogue.

## Notes

- The file relies on `gate` (a deferred promise pair) from `cart-fixtures.ts` rather than local helpers, keeping the out-of-order mechanism consistent across cart and wishlist tests.
- The `@api` mock spreads `importOriginal` so any non-stubbed exports remain available; only the three wishlist endpoints are replaced.
- `signInAs` deliberately flushes `nextTick()` once; if the store adds multi-step watchers, this may need updating.
- The header comment points to `infrastructure/utils/request-ticket.ts` as the production mechanism that enforces the ordering guaranteed here; the tests verify the store-side contract independently of that utility.
