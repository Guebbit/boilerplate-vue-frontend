---
source: src/modules/cart/tests/cart-view-stale-refusal.spec.ts
sha256: 89629d2a349c07b95177f0ec09e5b908e364b165402de8d79ff269c33bfa8f55
signature: 0f12ded914ebf9ab317768ecd79498d3c862852cd1c9d9e2f56ddeade316a026
generated_at: 2026-11-10T04:03:03.161388+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-stale-refusal.spec.ts

## Purpose

Verifies the cart page's recovery behavior when a checkout call is refused because the screen is out of date. Covers three refusal shapes — `CART_EMPTY`, `IDEMPOTENCY_IN_FLIGHT`, and a bare 500 — and asserts the page either re-reads the cart, retries under the same idempotency key, or navigates to the orders list depending on what the server reports.

## Key elements

- **`openThenRefuse(serverNow)`** — Helper that mounts the cart page with a two-item basket, picks `pickup` shipping, then arranges for the next `getCart` call to answer with `serverNow`. Returns the mounted page for the test to act on.
- **`describe('a refusal that says the screen is out of date')`** — Contains five `it` blocks:
  - *CART_EMPTY*: asserts the page shows zero cart items after the re-read.
  - *IDEMPOTENCY_IN_FLIGHT (never resolves)*: advances fake timers across all `IN_FLIGHT_RETRY_DELAYS_MS` values; expects `apiCheckout` called `1 + delays.length` times and zero items displayed.
  - *IDEMPOTENCY_IN_FLIGHT → success*: asserts two calls share the same `Idempotency-Key` header and the router lands on order `o1`.
  - *Bare 500, cart now empty*: asserts navigation to the `OrdersList` route.
  - *Bare 500, cart still full*: asserts the page stays on `Cart` and a second click uses a **different** idempotency key (the recorded 500 is replayed until the key is consumed).
- **`vi.mock('@api', …)`** — Partially mocks the API module so `getCart`, `setCartShippingMethod`, and `checkout` are individually controllable per-test.
- **`beforeEach`** — Resets mocks, sets up a default `setCartShippingMethod` answer, creates a fresh Pinia store, assigns a session viewer stub, loads the `en` locale, and pushes the router to `/en/cart`.
- **`afterEach`** — Restores real timers (safe even when fake timers were never activated).

## Relationships

- **`src/modules/cart/idempotent-calls.ts`** — Imports `IN_FLIGHT_RETRY_DELAYS_MS` to drive fake-timer advancement and to compute the expected retry count.
- **`src/modules/cart/tests/cart-fixtures.ts`** — Imports `aCart` to build inline cart payloads (populated and empty) for both initial mount and post-refusal re-reads.
- **`src/modules/cart/tests/mount-cart-page.ts`** — Imports `mountCartPage` (mounts the Vue component with test hooks like `pickShipping`) and the shared `router` instance used for navigation assertions.
- **`tests/support/unit/async-answers.ts`** — Imports `answered` (wraps a successful API payload) and `apiRejection` (builds a rejection with status + code) to shape `apiCheckout` mock answers.
- **`tests/support/unit/fixtures.ts`** — Imports `anOrder` to build the success-case order object (`{ id: 'o1' }`).
- **`tests/support/stub.ts`** — Imports `asStub` to cast a plain object into a `SessionViewer` for the Pinia session store.
- **`tests/support/unit/wire-modules.ts`** — Imports and calls `wireModulesIntoCore()` at module scope so the application's module registry is available before any mount.
- **`contracts/rest/index.ts`** — Provides the `@api` type surface (`getCart`, `setCartShippingMethod`, `checkout`) that is partially mocked; the mock preserves original types via `importOriginal<typeof import('@api')>()`.

## Notes

- The `openThenRefuse` helper uses `mockResolvedValueOnce` for the *initial* read and `mockResolvedValue` (persistent) for the *post-refusal* read, so the test only needs to set the one value it cares about.
- Fake timers are scoped to `['setTimeout']` only — `Date` and other globals remain real, avoiding interference with Vue's async scheduling.
- The "bare 500, cart full" test intentionally clicks **twice** and asserts the two idempotency keys differ, encoding the convention that a recorded 500 keeps replaying under the original key and the user must generate a fresh one to proceed.
- `sessionStorage.clear()` runs in `beforeEach`; any test that relies on persisted session state must set it explicitly.
