---
source: src/modules/cart/tests/store-checkout-key.spec.ts
sha256: 0b3fb255c7895c4547d70880d636bcc5083355946c39266c65b6aa1ebc19298c
generated_at: 2026-10-17T00:42:50.259046+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-checkout-key.spec.ts

## Purpose

Vitest spec for the cart store's `Idempotency-Key` handling on `POST /cart/checkout`. It verifies the key's lifecycle rules: it is bound to an order fingerprint and a specific person, survives a page reload, is replayed for lost answers and in-flight 409s, and is discarded when the server issues a terminal refusal (409 stock, bare 500 with a successful re-read).

## Key elements

- **`wireModulesIntoCore()`** — called once at module top to register the cart module with the core DI before any test runs.
- **`vi.mock('@api', …)`** — replaces every cart API function (`getCart`, `checkout`, `addCartItem`, etc.) with `vi.fn()` stubs so the spec controls responses.
- **`trackStores()` → `{ fresh, disposeAll }`** — factory for Pinia-backed store instances; `disposeAll()` is wired into `afterEach` to tear down state.
- **`loadedStore()`** — returns a fresh store whose `getCart` has already resolved with a 2-unit cart; required because the store refuses `checkout` until a cart read has occurred.
- **`sentPairs()`** — post-hoc inspection helper that maps `apiCheckout` mock calls to `{ key, body }` tuples (reads the `Idempotency-Key` header and JSON-serialises the body) so assertions can compare keys and bodies across calls.
- **`describe('one Idempotency-Key, one body', …)`** — nine cases covering: no key reuse across different bodies; key retention after a lost answer; key persistence across a simulated reload (new Pinia, same `localStorage`); key isolation between two sign-ins; key discard after a 409 stock refusal; key retention through a 503; key discard after a bare 500 when the re-read confirms the cart is empty; key retention after a bare 500 when the re-read also fails; and the store clearing `cartItems` after a successful re-read post-500.
- **`describe('an attempt the server says is still running', …)`** — two cases using `vi.useFakeTimers` to step through `IN_FLIGHT_RETRY_DELAYS_MS`; verifies the store retries under the *same* key on each 409 `IDEMPOTENCY_IN_FLIGHT` and eventually resolves with the replayed order, or gives up after exhausting the delay schedule while still preserving the key for the next user-initiated attempt.

## Relationships

- **`src/modules/cart/store.ts`** — the unit under test. The spec imports `IN_FLIGHT_RETRY_DELAYS_MS` (the retry schedule constant) and exercises `store.checkout()` and `store.fetchCart()`.
- **`contracts/rest/index.ts`** — the `@api` barrel that is mocked; the spec stubs `checkout`, `getCart`, and the full cart-mutation surface.
- **`tests/support/unit/cart-fixtures.ts`** — provides `aCart`, `answered`, `apiRejection`, and `lostAnswer` helpers used to shape API mock responses.
- **`tests/support/unit/fixtures.ts`** — provides `anOrder` for constructing a successful checkout payload.
- **`tests/support/unit/cart-interleave.ts`** — provides `signInAs` to simulate a session switch between two persons on the same tab.
- **`tests/support/unit/track-stores.ts`** — provides `trackStores` for creating and disposing Pinia store instances.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, the one-time DI registration that makes the cart store resolvable.

## Notes

- Key persistence across reloads is exercised through `localStorage`/`sessionStorage`, which `beforeEach` clears (`localStorage.clear(); sessionStorage.clear()`). The "reload" test creates a **new Pinia** to simulate a page restart while storage survives.
- The bare-500 case is deliberately split into two sub-cases: if the post-500 `getCart` re-read succeeds and returns an empty cart, the order was written, so the key is discarded; if the re-read fails (`lostAnswer`), the outcome is unknown and the key is retained for replay. Both paths are asserted.
- `IN_FLIGHT_RETRY_DELAYS_MS` is imported from the store module (not defined in the test), so the retry schedule is an implementation detail of the store, not a test constant.
- The `@api` mock lists every cart function, not just `checkout`/`getCart`, to prevent accidental passthrough of unstubbed calls.
