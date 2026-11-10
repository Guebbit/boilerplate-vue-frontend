---
source: src/modules/cart/tests/cart-view.spec.ts
sha256: 175461f7ed40958593e5633f0d4ecfa355febe1b3cf5fafd83844b29458d107e
signature: df24af27b84ee8c19828dbf524208550140d18c41834e80d28bc4d2bec8155d0
generated_at: 2026-11-10T04:03:33.180661+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view.spec.ts

## Purpose

Integration test suite that mounts the real `SignedInCart.vue` component against a real memory-history router and verifies that the checkout screen handles each of the seven documented refusal codes (from `docs/modules/cart-checkout.md`) with distinct, specific UI responses rather than a single generic toast. It also covers the order button's terms/privacy-link placement and an in-flight guard.

## Key elements

- **`A_CART`** — The canonical non-empty cart fixture (one line, `p1` × 2, `in_stock`, `checkoutable: true`, two shipping options) that every case starts from unless overridden.
- **`heldWith(items)`** — Builds a `CartResponse` from `[productId, quantity, availability]` tuples, setting `canIncrease` and `checkoutable` the way the server would (buyable = `in_stock` | `preorder` | `backorder`).
- **`checkoutRejection(status, code, details?)`** — Produces a reject-envelope-shaped object (`{ status, errors: [{ code, message, details }] }`) matching what `classifyCheckoutError` reads from the API.
- **`mountCart({ report, held, attach, products })`** — Core mount helper: seeds the cart store, stubs `fetchCart`/`setShippingMethod`/`clearCart`/product reads, spies on `cart.checkout` **before** mounting (because `SignedInCart` destructures it at setup), stubs `ShippingSelector`/`AddressPicker`/`PaymentMethodSelector`, and returns `{ wrapper, checkoutSpy, clearSpy, cart }` after a flush.
- **`vi.mock('@api', …)`** — Wraps the real `checkout` in `vi.fn(actual.checkout)` so only the in-flight-guard test can make it genuinely pending; `getAccount` always rejects with `'offline'` unless a case overrides.
- **`vi.mock('@/infrastructure/http/keepalive.ts')`** — Stubs `sendKeepalive` to assert what the page hands it on `pagehide`.
- **`beforeAll` route pre-loading** — Resolves `/en/orders/o1` through the router and eagerly invokes lazy-loaded route components so a trailing navigation never leaves an import in flight during teardown.
- **Test blocks** — `describe('the order button')` (terms link placement), `describe('the checkout refusals')` (CART_CHANGED refetch + naming, CART_CHANGED refetch-failure blocking, CART_TOTAL_CHANGED old/new totals, and further cases in the truncated portion).

## Relationships

- **`src/modules/cart/components/SignedInCart.vue`** — The component under test; mounted directly with real Pinia, Vuetify, i18n, and router plugins.
- **`src/modules/cart/store.ts`** — Seeded with `A_CART` or `heldWith(…)`; its `checkout`, `fetchCart`, `setShippingMethod`, and `clearCart` methods are spied on before mount.
- **`src/modules/cart/composables/use-checkout-draft.ts`** — Imported for `readCheckoutDraft`/`writeCheckoutDraft` (draft persistence assertions, likely in truncated cases).
- **`src/modules/cart/domain/index.ts` / `src/modules/cart/domain/merge-report.ts`** — Provides the `MergeReportLine` type used to seed the merge-report lines on the store and the merge-report alert UI under test.
- **`src/modules/products/tests/products-store.ts`** — `seedProducts` and `spyOnProductReads` populate the products store so cart lines can resolve product names.
- **`src/modules/cart/tests/mount-cart-page.ts`** — Supplies `AddressPickerStub` and the shared memory-history `router`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` called at module scope to register cart routes on the shared router.
- **`tests/support/unit/mounted-vm.ts`** — `emitOn` and `nextRenderTick` helpers for component interaction.
- **`tests/support/unit/axe.ts`** — `axeViolations` for accessibility assertions on attached wrappers.
- **`tests/support/unit/fixtures.ts`** — `NO_PRODUCT_ACTIONS` constant for product-action edge cases.
- **`tests/support/stub.ts`** — `asStub` for the session viewer stub in `beforeEach`.
- **`src/modules/cart/tests/guest-cart.property.spec.ts` / `src/modules/cart/tests/merge-report-alert.spec.ts`** — Sibling test files covering adjacent cart-view concerns (guest merge, merge-report alert) not duplicated here.

## Notes

- **Spy-before-mount is mandatory.** `SignedInCart.vue` destructures store methods at `setup()` time. Installing a spy after mount replaces the store's own property but leaves the component's captured reference pointing at the original. Every case must configure the spy returned by `mountCart`, never re-spy the store.
- **`ShippingSelector` stub emits on mount.** It fires `update:modelValue('pickup')` + `update:requiresAddress(false)` in its `mounted` hook purely to unblock the checkout button's `disabled` binding; the real shipping-method round-trip is covered in `store.spec.ts`.
- **`defineComponent` at top level, not inline in `stubs`.** TypeScript-ESLint cannot fully resolve `this.$emit` typing when the call sits inside `mount()`'s contextual object literal.
- **Teardown safety.** The `beforeAll` pre-loads lazy order routes and `afterAll` calls `vi.dynamicImportSettled()` after a `flushPromises` to guarantee no navigation's dynamic import is still in flight when Vitest tears down the environment.
- **`checkout` is only genuinely async in one case.** The `vi.mock('@api')` wraps the real implementation, so `cart.checkout` calls resolve immediately in all other tests; only the in-flight-guard test relies on a truly pending promise to set `cart.loading`.
