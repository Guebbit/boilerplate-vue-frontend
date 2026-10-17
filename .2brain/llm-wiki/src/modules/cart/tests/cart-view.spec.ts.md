---
source: src/modules/cart/tests/cart-view.spec.ts
sha256: cf3d9ea9ec55a39ba4b136eb8c5f6a6bf4b7697fa09df610332abf1a08617d00
generated_at: 2026-10-17T00:38:57.004789+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view.spec.ts

## Purpose

Integration-style spec that mounts the real `Cart.vue` page against a real memory-history router and verifies that each documented checkout refusal (CART_CHANGED, CART_TOTAL_CHANGED, CART_INSUFFICIENT_STOCK, etc.) produces its own distinct user-facing message rather than collapsing into a single generic toast. Also covers the order-button terms/privacy link placement and accessibility (axe-core).

## Key elements

- **`mountCart(opts?)`** – Shared helper that seeds the store with `A_CART`, spies on `fetchCart`, `setShippingMethod`, `checkout`, and `clearCart` *before* mounting (because `Cart.vue` destructures them at setup), stubs `ShippingSelector`/`AddressPicker`/`PaymentMethodSelector`, and returns `{ wrapper, checkoutSpy, clearSpy, cart }`.
- **`A_CART`** – A minimal valid `CartResponse` fixture (one product, two units, two shipping options) every case starts from.
- **`checkoutRejection(status, code, details?)`** – Builds a reject-envelope object matching the shape `classifyCheckoutError` reads.
- **`ShippingSelectorStub`** – A `defineComponent` that emits `update:modelValue: 'pickup'` and `update:requiresAddress: false` on mount, unblocking the checkout button without exercising real shipping selection.
- **`vi.mock('@api')`** – Wraps the real `checkout` in a `vi.fn` that calls through; only the in-flight-guard test overrides it with a genuinely pending promise.
- **`vi.mock('@/infrastructure/http/keepalive.ts')`** – Replaces `sendKeepalive` with a no-op spy.
- **`beforeAll`** – Resolves and invokes the lazy-loaded order-page route component so no dynamic import is still pending at teardown.
- **`afterAll`** – Calls `flushPromises()` then `vi.dynamicImportSettled()` to guarantee no in-flight import survives environment teardown.
- **`describe('the order button')` / `describe('the checkout refusals')`** – The two test groups covering link placement and each individual error-code response.

## Relationships

- **`Cart.vue`** – The component under test; mounted here with real router, Pinia, Vuetify, and i18n plugins.
- **`store.ts`** – `useCartStore` is seeded and spied on; the spec asserts its `fetchCart`, `checkout`, `clearCart`, and `setShippingMethod` call counts/messages.
- **`domain/index.ts` / `domain/merge-report.ts`** – Provides the `MergeReportLine` type used to type the `mergeReport` field the helper accepts.
- **`composables/use-checkout-draft.ts`** – `readCheckoutDraft` / `writeCheckoutDraft` are imported for draft-persistence assertions.
- **`tests/support/stub.ts`** – `asStub` builds the minimal `SessionViewer` object in `beforeEach`.
- **`tests/support/unit/mount-cart-page.ts`** – Supplies the shared `router` instance and `AddressPickerStub` component.
- **`tests/support/unit/mounted-vm.ts`** – `emitOn` and `nextRenderTick` used for event emission and render-timing assertions.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` called at module scope to register feature modules with the app shell before any mount.

## Notes

- **Spies must precede mount.** `Cart.vue` does `const { checkout: placeOrder } = useCartStore()` at setup. A spy installed after mount patches the store's own property but the component already holds a stale reference. All cases configure the spy returned by `mountCart`, never re-spy the store.
- **`@api` mock calls through.** The wrapper is `vi.fn(actual.checkout)`, so unless a test explicitly sets `mockRejectedValueOnce` / `mockReturnValue`, the real API logic runs. Only the in-flight-guard test needs a controllable pending promise.
- **`defineComponent` at top level, not inline in `stubs`.** TypeScript-ESLint cannot resolve `this.$emit` types when the component literal is nested inside `mount()`'s `stubs` object (contextual typing flows through).
- **Shipping is stubbed, not exercised.** The `ShippingSelectorStub` emits a no-address method purely to unblock the checkout button; real `PUT /cart/shipping-method` behavior is covered in `store.spec.ts`.
- **Pre-loading order routes in `beforeAll`.** Without it, a successful checkout navigation would start a first-time dynamic import of the orders module whose promise could still be pending when Vitest tears down the file's module registry.
