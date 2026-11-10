---
source: src/modules/cart/tests/cart-view-double-submit.spec.ts
sha256: 31227e4bf907fb6791a44cc12158a53a3505f404f7ff36717c6545dc1b2e658a
signature: b2e45fe1cf6d1a9c32b073e7f8f1a6534a42297fda2f58cd416e107914cbcf80
generated_at: 2026-11-10T04:02:11.940112+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-double-submit.spec.ts

## Purpose
Vitest spec that verifies the cart page is locked down while a checkout request is in flight: quantity steppers are disabled, a debounced step that was in progress does not mutate the cart after the order resolves, and two clicks dispatched in the same task produce exactly one checkout call.

## Key elements
- **`calledTimes(api, times)`** — async helper that polls (via `vi.waitFor`) until a mocked function has been called exactly `times` times.
- **`placingAnOrder()`** — sets up the page (loads a 2-unit cart, picks "pickup" shipping) and gates the `checkout` mock so the test controls when the order resolves. Returns `{ page, order }`.
- **`vi.mock('@api', …)`** — replaces `getCart`, `updateCartItemByProductId`, `setCartShippingMethod`, and `checkout` with `vi.fn()` while preserving other exports.
- **`beforeEach`** — clears session storage, resets mocks, defaults `setCartShippingMethod` to resolve the cart with the chosen method, activates a fresh Pinia, seeds a stub session viewer, loads the `en` locale, and navigates the router to `/en/cart`.
- **Three `it` cases** inside `describe('while an order is being placed')`:
  - Steppers gain `disabled` after the first checkout call is observed.
  - A quantity-increase click issued before the order resolves never calls `updateCartItemByProductId` once the router has navigated to the order page.
  - Two `trigger('click')` calls fired in the same microtask result in exactly one `checkout` call.

## Relationships
- **`contracts/rest/index.ts`** — the `@api` alias; its exported functions (`getCart`, `updateCartItemByProductId`, `setCartShippingMethod`, `checkout`) are the mocked surface under test.
- **`src/modules/cart/tests/cart-fixtures.ts`** — provides the `aCart` factory used to build the 2-unit cart fixture in every setup.
- **`src/modules/cart/tests/mount-cart-page.ts`** — provides `mountCartPage` (mounts the cart component with router/pinia wiring) and the shared `router` instance used for navigation assertions and teardown.
- **`tests/support/stub.ts`** — `asStub` types the minimal `SessionViewer` object injected into the Pinia store.
- **`tests/support/unit/async-answers.ts`** — `gate` creates a manually-resolvable promise for the checkout mock; `answered` wraps a value in the `{ promise, resolve }` shape; `Answer` is the generic type parameter.
- **`tests/support/unit/fixtures.ts`** — `anOrder` builds the order object (`{ id: 'o1' }`) that resolves the gated checkout.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register any global module wiring the cart page expects before any test runs.

## Notes
- The second test (`sends nothing that changes the cart…`) must wait for the router to land on the order route **before** unmounting; the comment explains that skipping this lets the lazy chunk resolve into a torn-down test environment.
- The third test relies on both `trigger('click')` promises being in the **same task** so Vue's `nextTick` (and thus the `disabled` re-render) has not run between them — a single sequential `await` would let the UI update and the second click would be a no-op, masking the dedup logic under test.
- `wireModulesIntoCore()` is invoked at the top of the file (outside `beforeEach`), so it runs once per spec file, not per test.
