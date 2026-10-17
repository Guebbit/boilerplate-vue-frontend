---
source: src/modules/cart/tests/cart-view-double-submit.spec.ts
sha256: f08156380c5861ea07609fc881df1047877c3db05939931e34fdfc6b5fcab2d7
generated_at: 2026-10-17T00:37:54.065058+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-double-submit.spec.ts

## Purpose

Vitest spec that verifies the cart page is safely "shut" while a checkout request is in flight: quantity steppers are disabled, any in-debounce quantity change never fires after the order resolves, and two rapid clicks in the same task produce exactly one `checkout` call.

## Key elements

- **`calledTimes(api, times)`** — Polling helper built on `vi.waitFor` that resolves once a mocked API function has been invoked exactly `times` times.
- **`placingAnOrder()`** — Setup helper that mocks `getCart` to return a one-item cart, mounts the cart page via `mountCartPage`, picks a shipping method, and arms `apiCheckout` with a `gate` (a manually-resolvable promise) so the test controls when the response lands. Returns `{ page, order }`.
- **`describe('while an order is being placed')`** — Three test cases:
  1. Steppers are `disabled` after the checkout button is clicked and the call is observed.
  2. A quantity change triggered inside its debounce window (before the gated response resolves) does not call `updateCartItemById` once the order resolves and the page unmounts.
  3. Two `click` events dispatched in the same microtask (no re-render between them) result in exactly one `apiCheckout` call.
- **`vi.mock('@api', …)`** — Partial mock that replaces `getCart`, `updateCartItemById`, `setCartShippingMethod`, and `checkout` with `vi.fn()` while preserving the rest of the module.
- **`beforeEach`** — Clears `sessionStorage`, resets mocks, defaults `setCartShippingMethod` to resolve an answered cart, activates a fresh Pinia, sets a stub session viewer, loads the `en` locale, and navigates the router to `/en/cart`.

## Relationships

- **`contracts/rest/index.ts`** (aliased `@api`) — The module under test's API surface; `getCart`, `updateCartItemById`, `setCartShippingMethod`, and `checkout` are all mocked here.
- **`tests/support/stub.ts`** — Provides `asStub`, used to create a minimal `SessionViewer` for the Pinia session store.
- **`tests/support/unit/cart-fixtures.ts`** — Supplies `aCart` (cart factory), `gate` (deferred-promise utility), `answered` (wraps a value in the expected response envelope), and the `Answer` type.
- **`tests/support/unit/fixtures.ts`** — Supplies `anOrder`, used to resolve the gated checkout with a realistic order payload.
- **`tests/support/unit/mount-cart-page.ts`** — Provides `mountCartPage` (mounts the cart component with router/store wiring) and the shared `router` instance used in `beforeEach` navigation.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called at module scope to register cart-related modules in the app core before any test runs.

## Notes

- `wireModulesIntoCore()` is called **unconditionally at module top-level**, not inside a `beforeEach`; it mutates shared core state and relies on test isolation provided by the other resets in `beforeEach`.
- The `gate` + `mockReturnValueOnce` pattern means the checkout promise stays pending until the test explicitly calls `order.resolve(…)`; forgetting to resolve (or unmount) will hang the test.
- The "two clicks in one task" test dispatches both `trigger('click')` calls via `Promise.all` to guarantee they land in the same microtask with no Vue re-render in between — this is the condition under which a naive `disabled` check between clicks would fail.
- The debounce-window test explicitly unmounts the wrapper after resolving the gate, because the router navigation to the order page is what would normally unmount the cart view and flush any pending debounced updates.
