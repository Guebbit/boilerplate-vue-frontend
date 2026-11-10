---
source: src/modules/cart/tests/store-add-key.spec.ts
sha256: 3f94c2b52051d80c632482b05a31c3efd87081a14dd4993e1de558b77495f6dd
signature: 016450bf0b5c707337df2108e98d238ad9a4862b30abbaceaedd40582a04334b
generated_at: 2026-11-10T04:09:53.139437+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-add-key.spec.ts

## Purpose
Spec that verifies the cart store's idempotency-key contract for `POST /cart/items` and `POST /cart/reorder`: a retry after a lost (network) answer must resend the **same** key, while any subsequent successful answer must cause the next call to mint a **fresh** key (new user intent).

## Key elements
- **`keysSent(calls)`** – Local helper that pulls the `Idempotency-Key` header out of each recorded mock call's options object; returns them in call order.
- **`describe('addCartItem')`** – Two tests:
  - *same key on retry, fresh key after answer* – Simulates a lost answer then a success, asserts `retry === first` and `secondClick !== first`.
  - *independent key per product* – Asserts that adding `p2` after a lost answer on `p1` does not reuse `p1`'s key.
- **`describe('reorder')`** – Mirrors the addCartItem retry/fresh-key pattern for `store.reorder(orderId)`.
- **`vi.mock('@api', …)`** – Module-level mock stubbing all cart API functions (`getCart`, `addCartItem`, `reorder`, etc.) with `vi.fn()`.
- **`freshStore()` / `disposeAll()`** – From `trackStores()`; creates a fresh Pinia store per test and disposes all tracked stores in `afterEach`.
- **`wireModulesIntoCore()`** – Called once at module scope to register module wiring before any test runs.

## Relationships
- **`cart-fixtures.ts`** – Supplies `aCart(lines)` used to shape the cart payload returned by the mocked API.
- **`cart-interleave.ts`** – Supplies `signInAs(userId)` to establish an authenticated session before exercising store actions.
- **`track-stores.ts`** – Supplies `trackStores()` which yields `fresh` and `disposeAll` for Pinia store lifecycle management.
- **`async-answers.ts`** – Supplies `answered(payload)` (resolves with a value) and `lostAnswer()` (rejects) to simulate network outcomes.
- **`wire-modules.ts`** – Supplies `wireModulesIntoCore()` to connect the module graph so store actions resolve their dependencies correctly in the test environment.

## Notes
- The `@api` mock is declared **once** at module scope, not per-test; `vi.resetAllMocks()` in `beforeEach` clears call history and implementations between tests.
- `keysSent` is intentionally **not exported** — it is a single-file assertion utility.
- The "independent key per product" test exists because idempotency keys are scoped to a single logical intent (product + action), not globally; two different products must never share a key even within the same "lost answer" window.
- `localStorage.clear()` in `beforeEach` matters because the store or its helpers may persist state to storage between tests.
