---
source: src/modules/cart/tests/store-double-seed.spec.ts
sha256: 3590a8f666f5f13df2a3f9db36a34a2814e62181c3165e64b75e97af61e28842
generated_at: 2026-10-17T00:42:59.869780+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-double-seed.spec.ts

## Purpose

Regression test that guarantees a burst of `seedAfterSignIn()` calls (e.g., the app shell calling it twice in the same tick) results in exactly **one** `mergeCart` API request. Without this guarantee the server would see the same guest cart key twice and the shopper could get a spurious "stays on this device" warning for a merge that is actually working correctly.

## Key elements

- **`wireModulesIntoCore()`** — called once at module scope to register the cart module against the store core before any test runs.
- **`vi.mock('@api', …)`** — replaces every `@api` export with a `vi.fn()`, isolating the test from the network layer.
- **`trackStores()` → `{ fresh, disposeAll }`** — `freshStore()` creates an isolated Pinia-backed store instance; `disposeAll()` tears them down in `afterEach`.
- **`gate<T>()` / `answered(value)`** — from the fixture helpers; `gate` returns a controllable promise (`{ promise, resolve }`), and `answered` wraps a value in the shape the store expects. Together they let the test defer the merge resolution until *both* `seedAfterSignIn` calls have been issued.
- **The single `it` block** — adds a guest item, fires `seedAfterSignIn()` twice back-to-back, resolves the gated merge, then asserts `mergeCart` was called **exactly once**.

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — supplies `aCart`, `gate`, `answered`, and the `Answer` type used to shape mock return values and control async resolution.
- **`tests/support/unit/track-stores.ts`** — supplies `trackStores()`, which manages creation and disposal of store instances across the test suite.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, which registers the cart module into the store's module registry so `store.seedAfterSignIn()` is reachable.

## Notes

- `wireModulesIntoCore()` is invoked at **module top-level**, not inside `beforeEach`. It is idempotent by design, but if a future refactor makes it non-idempotent, tests will silently break.
- The test deliberately does **not** await each `seedAfterSignIn` individually; both are fired and then settled together via `Promise.allSettled`. This mirrors the real-world race the test is guarding against.
- `localStorage` is cleared in `beforeEach` so guest-cart state never leaks between tests.
