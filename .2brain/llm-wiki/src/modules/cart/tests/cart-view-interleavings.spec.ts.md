---
source: src/modules/cart/tests/cart-view-interleavings.spec.ts
sha256: 10137d2bf55c200f5669aec70af993ca661ac77c6ac2393334371a62ffe60fdb
signature: c6bfacaa614d4f704b4d5b16e1b297e887ba266c7c60d99567f023c332c22ab4
generated_at: 2026-11-10T04:02:26.551783+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-interleavings.spec.ts

## Purpose

Integration tests for the cart page running against the **real** Pinia store, focused on event interleavings: the shipping radio seeded from a server-held value, a quantity step that must settle before checkout fires, and a lost checkout answer that is retried with the same idempotency key and body. The file complements `cart-view.spec.ts` (which stubs store methods and asserts rendered output) by asserting the interaction contract between page and store.

## Key elements

- **`calledTimes(api, times)`** — polls via `vi.waitFor` until a mocked API function has been called exactly `times` times.
- **`sent()`** — extracts `[Idempotency-Key, JSON body]` pairs from every `apiCheckout` mock call, in order, for retry-equality assertions.
- **`describe('the shipping radio')`** — three cases: radio opens on the server-held method; a pick made after the initial read is kept and the total reflects its cost; a 409 refusal reverts the radio to undefined.
- **`describe('a quantity step and the order that follows it')`** — two cases: checkout waits for an in-flight `updateCartItemByProductId` answer (uses `gate`); a 503 rejection of the step prevents checkout entirely.
- **`describe('an order whose answer was lost')`** — two cases: after a `lostAnswer()` rejection the button re-enables and the second click sends an identical key + body; on successful retry the router pushes the order id and the cart items are empty.
- **`vi.mock('@api', …)`** — partial mock preserving original exports while replacing `getCart`, `updateCartItemByProductId`, `setCartShippingMethod`, `checkout` with `vi.fn()`.
- **`wireModulesIntoCore()`** — called at module top-level (outside `beforeEach`) to register stores so the real store graph is available.

## Relationships

| Neighbor | Interaction |
|---|---|
| `cart-fixtures.ts` | Imports `aCart` to build cart state fixtures (line items, optional shipping method). |
| `mount-cart-page.ts` | Imports `mountCartPage` (mounts the page with the real store and returns a test helper) and `router` (used to spy on navigation in the retry case). |
| `tests/support/stub.ts` | Imports `asStub` to create a minimal `SessionViewer` stub for the session store. |
| `tests/support/unit/async-answers.ts` | Imports `gate` (deferred resolve for in-flight steps), `lostAnswer` (simulated network loss), and `answered` (wraps a payload as a resolved answer). |
| `tests/support/unit/fixtures.ts` | Imports `anOrder` to construct order objects for checkout success responses. |
| `tests/support/unit/wire-modules.ts` | Imports `wireModulesIntoCore` to register the real Pinia stores into the test context. |

## Notes

- This file is the **real-store** half of the cart view test suite; `cart-view.spec.ts` is the **stubbed-store** half that asserts rendered markup for each refusal. Do not duplicate render-assertion cases here.
- Stale/late-answer crossing cases live in `store-stale-answer.spec.ts` and `store-late-answer.spec.ts`; shipping-radio edge cases live in `cart-view-shipping-radio.spec.ts`.
- The `afterEach` block is intentionally empty (comment-only); it exists as a reminder to restore any spied globals (`router.push`, product reads) a case may have touched.
- `wireModulesIntoCore()` runs once at import time, not per-test—relying on it inside a `describe` block would be too late for store registration.
