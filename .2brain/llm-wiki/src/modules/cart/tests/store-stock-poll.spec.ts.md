---
source: src/modules/cart/tests/store-stock-poll.spec.ts
sha256: 1a74c018fb4ab9f1c69c7e9ab2fd092d5fe483f01f00d69d46829835db0d8c06
signature: 505002c2f270494d7f4d095f939769998cf0a2fbf129bee56eaf9b76af5053b6
generated_at: 2026-11-10T04:11:42.239157+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-stock-poll.spec.ts

## Purpose

Vitest spec for the cart store's `pollCart` background read. It verifies that polling refreshes cart line availability without letting a stale answer overwrite a fresher state, never toggles `loading`, and leaves the merge report untouched.

## Key elements

- **`serverHolds(cart)`** – local helper that sets `getCart` to resolve with `answered(cart)`, simulating a server response.
- **`freshStore` / `disposeAll`** – obtained from `trackStores()`; creates a fresh Pinia-backed store per test and disposes all tracked stores in `afterEach`.
- **`describe('what a poll does')`** – basic-behavior tests: replaces cart on success, does not flip `loading`, preserves `mergeReport`, rejects on server error without mutating cart, allows re-poll after failure.
- **`describe('a poll yields to anything fresher')`** – race-condition tests: poll skips the request while a write is in-flight, skips while another poll is out, drops its answer when a newer write/removal/explicit read has already settled, and drops the answer entirely after the user signs out.
- **Module-level mocks** – `vi.mock('@api', …)` stubs every cart API function; `wireModulesIntoCore()` is called once at import time to register module wiring.

## Relationships

- **`tests/support/unit/async-answers.ts`** – provides `gate`, `answered`, and the `Answer` type used to hold a promise open and resolve it at a precise point in each test, enabling deterministic interleaving.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked at module scope so the store's internal module references resolve during tests.
- **`src/modules/cart/tests/cart-fixtures.ts`** – `aCart` builds `CartResponse` fixtures (items, quantities, optional availability) used throughout.
- **`src/modules/cart/tests/cart-interleave.ts`** – exports `issue`, `ACTIONS`, and `signInAs`; this spec uses `issue` with an `ACTIONS` member to simulate a concurrent write, and `signInAs` to exercise the sign-out drop case.
- **`src/modules/cart/tests/track-stores.ts`** – `trackStores()` manages per-test store creation and teardown.
- **`contracts/rest/index.ts`** – the `@api` module that this spec mocks; its exported functions (`getCart`, `updateCartItemByProductId`, `deleteCartItemByProductId`, etc.) are the interface under test.

## Notes

- `wireModulesIntoCore()` runs at **module import time**, not inside `beforeEach`; it mutates shared state once for the whole suite.
- The `gate`/`answered` pattern is the core mechanism for race tests: a `gate` returns a controllable promise, and `answered` wraps the payload. Resolving the gate at the wrong point would make a race test pass vacuously.
- `vi.resetAllMocks()` in `beforeEach` clears all `@api` mock state; `serverHolds` must be called per test.
- The "drops its answer" tests assert the store's cart **equals the newer write's result**, not merely that the poll's payload was ignored—confirming the poll's resolution does not re-apply its payload.
