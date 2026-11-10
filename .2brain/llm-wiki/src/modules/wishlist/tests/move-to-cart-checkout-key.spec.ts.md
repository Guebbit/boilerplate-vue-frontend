---
source: src/modules/wishlist/tests/move-to-cart-checkout-key.spec.ts
sha256: a31c1a317fee7d72d5fa593b207fa7b6ffc3d73955e6a80274a8662edbf6723d
signature: f1e0c2bfda5446e91b1d0b31657adb2375024142123d091fc7ef51acff93d25e
generated_at: 2026-11-10T06:20:13.627254+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/move-to-cart-checkout-key.spec.ts

## Purpose

Verifies that after a saved product is moved into the cart, the next checkout attempt carries a **fresh** `Idempotency-Key` rather than reusing the key of a prior attempt whose server response was lost. The invariant exists because the key is derived from a cart fingerprint; mutating the cart invalidates any previous key, and reusing it would cause the server to replay a stale order for a different basket.

## Key elements

- **`wireModulesIntoCore()`** – called at module top level; wires the cart/wishlist module graph into the test's DI container so the real stores and generated client resolve correctly.
- **`Request` interface** – minimal shape (`url`, `method`, `headers`) used to type the mock's argument.
- **`checkoutsToLose` / `cartReads`** – mutable counters driving the mock's behavior across successive calls within a single test.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a route-based mock. `POST /cart/checkout` rejects with `lostAnswer()` while `checkoutsToLose > 0`, then resolves with `anOrder()`. `GET /cart` returns a 1-unit cart on the first read and a 2-unit cart thereafter. `POST /wishlist/items/p1/move-to-cart` resolves with an empty item list.
- **`lastCheckoutKey()`** – inspects `orvalMutator`'s mock calls, finds the last `POST /cart/checkout`, and reads the `Idempotency-Key` from the **second argument** (per-call options), not the request config.
- **`beforeEach`** – clears `sessionStorage`, resets Pinia, clears all mocks, and zeroes both counters.
- **The single test** (`'ends the checkout attempt whose answer was lost…'`) – fetches the cart, forces one lost checkout, records that key, moves `p1` from wishlist to cart, runs a second checkout, and asserts the new key differs.

## Relationships

- **`src/infrastructure/http/index.ts`** – the sole mock seam; `orvalMutator` is replaced so no real network I/O occurs, while the stores and generated client above it run for real.
- **`src/modules/wishlist/store.ts`** – the store under test; `useWishlistStore().moveToCart('p1')` is the action that triggers the cart mutation.
- **`tests/support/unit/async-answers.ts`** – supplies `lostAnswer()`, the rejection value used to simulate a transport-level lost response.
- **`tests/support/unit/fixtures.ts`** – supplies `anOrder()`, the resolved payload for a successful checkout.
- **`tests/support/unit/wire-modules.ts`** – supplies `wireModulesIntoCore()`, which patches the runtime module graph so stores can resolve their dependencies without a full app boot.

## Notes

- The `Idempotency-Key` travels in the mutator's **second argument** (per-call options object), not in the request `config`. The `lastCheckoutKey` helper indexes `[1]` for this reason.
- `cartReads` encodes a subtle assumption: the first `GET /cart` (page load) sees 1 unit, and the read after the move sees 2 units. This is what changes the cart fingerprint and therefore the key.
- The test is transport-mocked (like `store.spec.ts`), meaning Pinia stores, the generated orval client, and key-derivation logic all execute for real; only the HTTP boundary is faked.
