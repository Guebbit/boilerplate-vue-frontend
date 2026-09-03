# src/modules/cart/tests/cart-view.spec.ts

## Purpose

Vitest integration spec that mounts the real `Cart.vue` against a real memory-history router (built from `collectModuleRoutes(enabledModules)`) and verifies that each of the four documented checkout refusals produces a distinct, specific UI response rather than collapsing into one generic toast. It is the component-level counterpart to the domain-layer tests in `docs/modules/cart-checkout.md`.

## Key elements

- **`wireModulesIntoCore()`** (imported from `tests/support/unit/wire-modules.ts`) — called at module top level before any test runs; registers enabled modules into the kernel so `collectModuleRoutes` can resolve real route components.
- **`router`** — a `createRouter` instance using `createMemoryHistory`, scoped to `/:locale` with children from `collectModuleRoutes(enabledModules)`. Shared across all cases in this file.
- **`A_CART`** — a minimal `CartResponse` fixture (one item, quantity 2, total 20 EUR) seeded into the Pinia store before each mount.
- **`checkoutRejection(status, code, details?)`** — factory returning a `ResponseReject`-shaped object matching what `classifyCheckoutError` expects to read.
- **`mountCart()`** — creates a fresh Pinia, seeds `A_CART`, spies on `fetchCart` / `resolveTitles` / `checkout` (spy installed *before* `mount` because `Cart.vue` destructures `checkout` at setup), then mounts `Cart` with router, vuetify, i18n plugins and stubs for `LayoutDefault` / `ShippingSelector`. Returns `{ wrapper, checkoutSpy, cart }`.
- **`flushAsync()`** — a 20 ms macrotask promise used to drain arbitrarily deep `.then().catch()` microtask chains produced by the click handler.
- **`describe('the checkout refusals')`** — four `it` blocks covering `CART_CHANGED` (re-fetches cart), `CART_INSUFFICIENT_STOCK` (renders per-line shortfall rows), stale-banner cleanup between successive refusals, and `CART_ADDRESS_NOT_FOUND` (must *not* render shortfall rows).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — imported and invoked at module scope (`wireModulesIntoCore()`) to ensure the kernel registry is populated before `collectModuleRoutes(enabledModules)` resolves real child components for the router.

## Notes

- The `checkout` spy is intentionally placed **before** `mount()` in `mountCart()`. `Cart.vue` destructures `checkout` from the store during `setup()`, so a spy installed after mount would replace the store's own property but leave the component's already-captured reference untouched. All four cases configure `checkoutSpy.mockRejectedValueOnce` rather than re-spying.
- `fetchCart` is expected to be called **twice** in the `CART_CHANGED` case: once from `onMounted`, once from the refusal handler. Tests asserting "only" one call would be incorrect.
- `flushAsync` uses a real `setTimeout` (macrotask) rather than `vi.useFakeTimers` or multiple `nextTick` calls, because the click handler's rejection chain can span more than two microtask turns.
- The `CART_ADDRESS_NOT_FOUND` case asserts the **absence** of shortfall rows as its distinguishing signal; the positive message assertion lives in the domain-layer test, not here.
- The file deliberately avoids `vi.useFakeTimers`; all async settling relies on the 20 ms macrotask boundary, keeping the test environment closer to production timing.
