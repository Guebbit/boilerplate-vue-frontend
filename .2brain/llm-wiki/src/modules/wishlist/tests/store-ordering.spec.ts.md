---
source: src/modules/wishlist/tests/store-ordering.spec.ts
sha256: 139e37d053320f9d97fbfd39d73bda5abae26b1ca1d274c810b1b890818614e2
signature: 43e3d8f577681dd3011e0f7dadfc502e4e4e4e4fe202866f4699a6dbc593ce44
generated_at: 2026-11-10T06:20:38.884562+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/store-ordering.spec.ts

## Purpose

Tests that the wishlist store discards or overrides stale async responses when answers arrive out of order, and that a response in-flight during a viewer switch never leaks the previous viewer's list to the next one. It encodes the same "ticket rule" as the cart store tests.

## Key elements

- **`answer(...ids)`** – Builds a resolved API envelope (`{ items: [{ productId, availability: 'in_stock' }] }`) for the given product IDs.
- **`signInAs(id?)`** – Sets (or clears) the session viewer and returns `nextTick()` so Pinia watchers flush before assertions run.
- **`wireModulesIntoCore()`** – Module-level call that installs test doubles into the core DI layer before any tests execute.
- **`vi.mock('@api', …)`** – Replaces `getWishlist`, `createWishlistItem`, and `deleteWishlistItem` with `vi.fn()` stubs while preserving the rest of the `@api` surface via `importOriginal`.
- **`describe('answers that arrive in the wrong order')`** – Uses `gate()` from the async-answers helper to interleave a `createWishlistItem` and `deleteWishlistItem` resolution order, asserting the store reflects the *later* write.
- **`describe('an answer for the person who is gone')`** – Starts a `getWishlist` call as viewer `a`, switches to viewer `b`, then resolves the old call; asserts the store is empty for the new viewer.

## Relationships

- **`src/modules/wishlist/store.ts`** – The store under test; `useWishlistStore` is imported and its `addToWishlist`, `removeFromWishlist`, and `fetchWishlist` actions are exercised.
- **`tests/support/unit/async-answers.ts`** – Provides `gate`, `answered`, and the `Answer` type used to control and type-check deferred API resolutions.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, which injects test doubles into the application's module registry.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** – Referenced in the module doc comment as the analogous test that enforces the same ticket/stale-answer rule for the cart store.

## Notes

- The module doc comment points to `infrastructure/utils/request-ticket.ts` as the implementation of the ticket rule; these tests verify its observable effect at the store level rather than testing the utility directly.
- `signInAs` must be awaited (it resolves `nextTick`) before asserting on store state, because viewer changes propagate through Pinia watchers rather than synchronously.
- The `@api` mock uses `importOriginal` spread so that any non-mocked exports (types, other functions) remain available, matching the pattern in the cart tests.
