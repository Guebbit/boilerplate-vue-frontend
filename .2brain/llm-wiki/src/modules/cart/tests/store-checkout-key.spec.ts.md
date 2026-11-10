---
source: src/modules/cart/tests/store-checkout-key.spec.ts
sha256: 03bbf267563ef2e7facf997288f21dc2bc6c1eb7b343cc974269b4b81b97b7fa
signature: f783f80d4f590dc1f2117e503d66eeb3ec77df6b4f20d4956340ecaea73ff6bc
generated_at: 2026-11-10T04:10:14.601238+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-checkout-key.spec.ts

## Purpose

Vitest spec for the cart store's `Idempotency-Key` lifecycle on `POST /cart/checkout`. It verifies the store's rules for when a key is **reused** (same order after a lost answer, 503, unknown 500, in-flight 409 retries) versus **rotated** (different body, definitive server verdict like insufficient stock, confirmed order written, different signed-in person), ensuring the client never sends one key with two bodies and never leaks a key across users.

## Key elements

- **`loadedStore()`** — creates a fresh store that has already called `fetchCart` (2 × `p1`), because checkout refuses to run before a cart read.
- **`sentPairs()`** — extracts every `[Idempotency-Key, serialized-body]` pair from `apiCheckout` mock calls, in send order; used to assert reuse/rotation.
- **`freshStore` / `disposeAll`** (from `trackStores`) — Pinia store factory + cleanup so each test gets an isolated store instance.
- **`describe("one Idempotency-Key, one body")`** — 9 cases covering: no reuse across different bodies; reuse after lost answer, reload, 503, unknown-500; rotation after different body, 409 insufficient-stock, confirmed-500 (cart still full), and cross-user inheritance.
- **`describe("an attempt the server says is still running")`** — 2 cases using fake timers to advance through `IN_FLIGHT_RETRY_DELAYS_MS` steps, asserting the same key is retried each wait and that a "next press" after exhaustion still carries the original key.
- **`vi.mock('@api', …)`** — replaces the entire API surface with `vi.fn()` stubs; tests drive only `getCart` and `checkout`.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/cart/idempotent-calls.ts` | Imports `IN_FLIGHT_RETRY_DELAYS_MS` to drive fake-timer advances in the in-flight retry cases. |
| `src/modules/cart/tests/cart-fixtures.ts` | Imports `aCart` to build the 2-unit cart fixture passed to `getCart`. |
| `src/modules/cart/tests/cart-interleave.ts` | Imports `signInAs` to switch the signed-in identity between "a" and "b" for the cross-user test. |
| `src/modules/cart/tests/track-stores.ts` | Imports `trackStores` for per-test Pinia store creation and `disposeAll` in `afterEach`. |
| `tests/support/unit/async-answers.ts` | Imports `answered`, `lostAnswer`, `apiRejection` to shape mock resolve/reject values (HTTP status, in-flight, timeout). |
| `tests/support/unit/fixtures.ts` | Imports `anOrder` as the successful checkout response. |
| `tests/support/unit/wire-modules.ts` | Imports `wireModulesIntoCore()` (called at module top) to wire the DI container before any test runs. |
| `contracts/rest/index.ts` | Provides the `@api` module (the mocked surface); the test asserts on the request shape defined by that contract. |

## Notes

- **Bare-500 tri-state logic.** The store re-reads the cart after an unadorned 500. If the re-read succeeds and the cart is **full**, the key is *rotated* (server didn't act). If the re-read **fails** (lost), the key is *kept* (state unknown, replay is safe). If the re-read succeeds and the cart is **empty**, the order was written and the key is rotated. Three separate tests pin all three branches.
- **Fake-timer scope.** `vi.useFakeTimers({ toFake: ['setTimeout'] })` is applied only inside the in-flight `it` blocks; `afterEach` calls `vi.useRealTimers()` unconditionally to guarantee cleanup.
- **`loadedStore` vs. `freshStore`.** Tests that need a prior cart read use `loadedStore`; the cross-user and reload tests re-invoke it after a Pinia reset or sign-in change to simulate a "new page" while `localStorage`/`sessionStorage` (cleared only in `beforeEach`) persist the key.
- **`@api` is fully mocked at module level.** No real HTTP occurs; assertions are on the mock call log, making the tests deterministic and independent of network timing.
