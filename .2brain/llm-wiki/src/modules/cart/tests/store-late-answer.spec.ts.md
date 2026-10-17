---
source: src/modules/cart/tests/store-late-answer.spec.ts
sha256: 3043b373d09dfb51fa28bb3b4242e9011b24780ce33a2f5555f4c4f3773a8b5c
generated_at: 2026-10-17T00:43:28.026380+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-late-answer.spec.ts

## Purpose

Verifies that the cart store's per-person reset acts as a hard barrier: when an in-flight API answer (cart read, badge summary, merge report) finally resolves *after* the tab has moved to a different user—or to nobody—that data must never appear in the store. Each test forces a response to land late via a deferred promise and asserts the next person's state stays clean.

## Key elements

- **Module-level `wireModulesIntoCore()`** — registers the cart module into the core container before any test runs.
- **`vi.mock('@api', …)`** — replaces the entire API layer with `vi.fn()` stubs so tests can gate individual calls.
- **`trackStores()` → `{ fresh, disposeAll }`** — factory that creates a fresh store per test and disposes all tracked instances in `afterEach`.
- **`beforeEach` / `afterEach`** — standard Vitest lifecycle: clears `localStorage`, installs a fresh Pinia, resets mocks, then disposes stores.
- **`it.each` block (4 rows)** — parameterised over `read`, `update`, `add`, `shipping` actions; asserts `store.cart` and `store.badgeQuantity` are `undefined` after a late answer.
- **`it('…to nobody, after a logout')`** — same scenario but the tab goes to an unauthenticated state.
- **`it('…late badge read…')`** — dedicated path for `getCartSummary` (different API endpoint than the cart read).
- **`it('…merge report or cart')`** — dedicated path for `mergeCart`; asserts both `store.cart` and `store.mergeReport` stay empty.
- **`gate<T>()` / `answered(payload)`** (from fixtures) — create a manually-resolvable promise so the test controls *when* the API "answers."

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — supplies `aCart`, `gate`, `answered`, and the `Answer` type used to construct canned API responses and deferred promises.
- **`tests/support/unit/cart-interleave.ts`** — supplies `ACTIONS` (named action factories), `issue` (fires an action and returns a controllable request handle), and `signInAs` (switches the active user context).
- **`tests/support/unit/track-stores.ts`** — supplies `trackStores` so every store created in a test is tracked and torn down deterministically.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore`, called once at module scope to attach the cart module to the core DI container before any test executes.

## Notes

- Promises that the store rejects on reset are caught with `.catch(() => undefined)` to prevent unhandled-rejection noise; the test still `await`s the outer promise to confirm resolution order.
- The `it.each` rows cover the four "cart action" paths that share the same `getCart`-style endpoint. Badge (`getCartSummary`) and merge (`mergeCart`) use different API functions, so they each get a standalone `it` that mocks the specific call with `mockReturnValueOnce`.
- `vi.waitFor` in the merge test ensures the `mergeCart` mock has been invoked before the test proceeds to sign in as B—avoids a race between the store's internal call and the assertion setup.
- The `gate` pattern means the test explicitly decides *when* the "network" answers; no real timer or network is involved.
