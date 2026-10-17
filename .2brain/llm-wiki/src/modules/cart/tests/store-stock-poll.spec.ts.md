---
source: src/modules/cart/tests/store-stock-poll.spec.ts
sha256: 13545439160c34f2ea991cdef46f2e5f848df15053da74e0d8dd9d6aad6d27be
generated_at: 2026-10-17T00:43:56.193004+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-stock-poll.spec.ts

## Purpose

Vitest spec for the cart store's background `pollCart` read. It verifies that a poll refreshes the cart (and per-line `availability`) while guaranteeing a stale answer can never overwrite a fresher one, that `loading` and `mergeReport` remain untouched, and that the poll correctly yields to and defers to in-flight writes, other polls, and explicit reads.

## Key elements

- **`serverHolds(cart)`** — local helper; stubs `getCart` to resolve with `answered(cart)`.
- **`freshStore` / `disposeAll`** — obtained from `trackStores()`; each test gets an isolated Pinia store, disposed in `afterEach`.
- **`describe('what a poll does')`** — five tests covering: cart replacement with availability, no `loading` toggle, `mergeReport` left intact, rejection on server error (cart unchanged), and successful retry after a failure.
- **`describe('a poll yields to anything fresher')`** — eight tests covering: no poll while a write is in flight, poll succeeds after write settles, no double-poll, and answer-discard scenarios (write overtook poll, removal overtook poll, explicit `fetchCart` overtook poll, sign-out invalidated the poll).
- **`vi.mock('@api', …)`** — module-level mock of every cart endpoint (`getCart`, `updateCartItemById`, `removeCartItem`, etc.).
- **`wireModulesIntoCore()`** — called once at module scope to register the store with Pinia before any test runs.

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — supplies `aCart`, `gate`, `answered`, and the `Answer` type used to build inline cart payloads and controllable promise gates.
- **`tests/support/unit/cart-interleave.ts`** — supplies `ACTIONS`, `issue`, and `signInAs` to simulate concurrent write/read sequences and user switching without real network calls.
- **`tests/support/unit/track-stores.ts`** — supplies `trackStores`, which hands back `freshStore` (new Pinia per test) and `disposeAll` (teardown).
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore`, the one-time setup that attaches the cart module to the Pinia instance under test.
- **`contracts/rest/index.ts`** — source of the `CartResponse` type (imported via `@types`), defining the shape asserted against in every test.

## Notes

- The `@api` mock is declared once at the top of the file; individual tests override specific methods with `mockResolvedValueOnce` or `mockResolvedValue` as needed. Forgetting to reset between tests is handled by the `vi.resetAllMocks()` in `beforeEach`.
- Staleness tests rely on the `gate<Answer<…>>()` pattern: the test holds the promise, performs the "fresher" action, then resolves the gate to simulate the stale answer arriving last. Order of resolution is what makes each scenario deterministic.
- The sign-out test (`signInAs('a')` → `signInAs()`) exercises an edge case where the poll's answer is invalidated by a user change mid-flight; it expects `store.cart` to be `undefined` afterward.
