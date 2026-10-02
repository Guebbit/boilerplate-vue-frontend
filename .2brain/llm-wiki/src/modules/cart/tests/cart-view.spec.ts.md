---
source: src/modules/cart/tests/cart-view.spec.ts
sha256: bc7439d84b2f50196502df5606a5924dbed85711970738e34707d99eccb0b9e4
generated_at: 2026-10-02T15:00:36.554857+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view.spec.ts

## Purpose

Vitest spec that mounts the real `Cart.vue` checkout screen against a real memory-history router and verifies each of the seven documented checkout refusals (from `docs/modules/cart-checkout.md`) produces a distinct, correctly-worded UI response rather than collapsing into a single generic toast. The store's network methods are stubbed so every case controls exactly one rejection.

## Key elements

- **`mountCart()`** — Seeds `useCartStore` with the `A_CART` fixture, spies on `fetchCart`, `fetchProductsByIds`, `setShippingMethod`, `checkout`, and `clearCart` *before* mounting (see Notes), mounts `Cart.vue` with stubs for `ShippingSelector`, `AddressPicker`, `PaymentMethodSelector`, and `LayoutDefault`, flushes promises, and returns `{ wrapper, checkoutSpy, clearSpy, cart }`.
- **`AddressPickerStub`** — Inline component emulating a shopper who leaves the pickers at defaults: shipping → `addr-1`; billing → `billing-1` (or `undefined` when "same as shipping" is on).
- **`ShippingSelectorStub`** (defined inside `mountCart`) — Emits `pickup` + `requiresAddress: false` on mount purely to unblock the checkout button's `disabled` binding.
- **`A_CART`** — Shared non-empty cart fixture (one line, two shipping options) every test starts from.
- **`checkoutRejection(status, code, details?)`** — Factory returning a reject-envelope shape matching what `classifyCheckoutError` reads.
- **`router`** — Built from `collectModuleRoutes(enabledModules)` with `createMemoryHistory`; scoped to `/​:locale` → `RouterView`.
- **`vi.mock('@api')`** — Wraps the real `checkout` in `vi.fn(actual.checkout)` so it calls through unless a test overrides; other rejections are handled by spying on the store method instead.
- **`vi.mock(keepalive)`** — Replaces `sendKeepalive` with a spy; tests assert what the page passes to it on `pagehide`.
- **`describe('the checkout refusals')`** — Individual `it` blocks for `CART_CHANGED`, `CART_INSUFFICIENT_STOCK`, stale-banner cleanup, `CART_PRODUCT_UNAVAILABLE`, and (truncated) remaining cases.

## Relationships

- **`tests/support/stub.ts`** — Exports `asStub`, used in `beforeEach` to create the minimal `SessionViewer` object for the session store.
- **`tests/support/unit/wire-modules.ts`** — Exports `wireModulesIntoCore()`, called at module scope *before* the router is constructed so `collectModuleRoutes(enabledModules)` resolves to the fully wired route tree.
- **`tests/support/unit/mounted-vm.ts`** — Exports `emitOn` and `nextRenderTick`, imported for event-emission and render-tick utilities (used in truncated portions of the file).

## Notes

- **Spy-before-mount is mandatory.** `Cart.vue` destructures `checkout` (as `placeOrder`) and `clearCart` from the store at `setup` time. A spy installed *after* mount mutates the store's own property but does not reach the reference the component already captured. All cases must configure the spy returned by `mountCart()`, not re-spy the store.
- **`@api` mock calls through by default.** `vi.fn(actual.checkout)` means the real implementation runs unless a test calls `mockRejectedValueOnce`. Only the in-flight-guard test (where `cart.loading` must genuinely be `true`) needs to intercept at this level.
- **`ShippingSelectorStub` does not test shipping selection.** It exists solely to satisfy the `disabled` guard on the checkout button. The real `PUT /cart/shipping-method` round-trip is covered in `store.spec.ts`.
- **`AddressPickerStub` is defined at file top level** (not inline in the `stubs` object) because TypeScript-ESLint cannot resolve `this.$emit` types when the `defineComponent` call is nested inside `mount()`'s contextual typing.
- The file is truncated; the full suite covers seven refusal cases per the module doc.
