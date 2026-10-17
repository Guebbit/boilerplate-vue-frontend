---
source: src/modules/cart/tests/cart-view-shipping-radio.spec.ts
sha256: d0e1bab96bccc3578a7e134f548961c48505661ffb8781fd9a69a13b91a70d3d
generated_at: 2026-10-17T00:38:24.152806+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-shipping-radio.spec.ts

## Purpose

Vitest spec that verifies the cart page's shipping radio handles three race/ordering scenarios between the opening `getCart` read and a `setCartShippingMethod` pick: a stale opening read must not wipe a fresh pick, a late opening read must not leave an outdated cost, and a subsequent read that clears the method must move the radio off it.

## Key elements

- **`calledTimes(api, times)`** — Local helper wrapping `vi.waitFor` to await until a mocked API function has been called exactly `times` times. Used to synchronise test steps before resolving gates.
- **`describe` block (one suite, three tests):**
  - *"keeps the method … when the opening read answers before the pick"* — Resolves the `getCart` gate first (with `null` method), then the `setCartShippingMethod` gate (with `'standard'`); asserts the radio still shows `'standard'` and checkout is enabled.
  - *"shows the cost … when the opening read answers after the pick"* — Resolves the pick gate first, then the opening gate (with `null` method); asserts the total text contains the method's surcharge (`25.00` for 2 × 10 + 5).
  - *"follows the server when a later read says the method is gone"* — Mounts with `'standard'`, then calls `page.cart.fetchCart()` with a response holding `null`; asserts `selectedShipping()` becomes `undefined`.
- **`vi.mock('@api')`** — Partially replaces `getCart`, `updateCartItemById`, `setCartShippingMethod`, and `checkout` with `vi.fn()` stubs; other `@api` exports are preserved via `importOriginal`.
- **`beforeEach`** — Resets mocks, sets the default `setCartShippingMethod` implementation (resolves a cart holding the picked method), creates a fresh Pinia instance, stubs the session viewer, and navigates the router to `/en/cart`.

## Relationships

- **`tests/support/unit/mount-cart-page.ts`** — Provides `mountCartPage` (mounts the cart Vue page and exposes `pickShipping`, `selectedShipping`, `cart`, `wrapper`) and `router` (used for navigation in `beforeEach`).
- **`tests/support/unit/cart-fixtures.ts`** — Provides `aCart` (builds a cart answer fixture), `gate` (creates a manually-resolvable promise pair for controlling async ordering), `answered` (wraps a cart as an API `Answer`), and the `Answer` type.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called once at module scope to register cart modules into the core module registry before tests run.
- **`tests/support/stub.ts`** — Provides `asStub`, used to cast a plain object into a `SessionViewer` type without implementing the full interface.

## Notes

- The `gate` pattern (a `{ promise, resolve }` pair) is the primary tool for deterministically ordering two in-flight promises. Always resolve the gate *after* asserting the corresponding API call count with `calledTimes`; this guarantees the pick has been dispatched before the response is injected.
- The default `setCartShippingMethod` mock in `beforeEach` resolves a cart that **holds** the picked method. Individual tests override this with `mockReturnValueOnce` to simulate the server *not* holding it (e.g., the "method is gone" case).
- `vi.resetAllMocks()` in `beforeEach` clears the default implementation set above; the implementation is re-applied immediately after the reset.
- The spec does **not** test UI rendering of the radio options themselves—only the state the radio ends up in after each race scenario.
