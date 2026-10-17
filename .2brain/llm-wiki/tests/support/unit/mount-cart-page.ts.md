---
source: tests/support/unit/mount-cart-page.ts
sha256: 347ed36593624e15c232dc446294edaddfaf9e0f8720bfad69bef408ee7dbf29
generated_at: 2026-10-17T02:28:57.055899+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/mount-cart-page.ts

## Purpose

Test helper that mounts the real `Cart.vue` page against the **real** cart store, leaving only the network layer (`@api`) to the spec. It exists for specs that need to observe store↔page interactions when responses cross (interleavings, double-submits, stale refusals), where stubbing store methods (as `cart-view.spec.ts` does) would hide the behavior under test.

## Key elements

- **`router`** – A `createMemoryHistory` router pre-loaded with `collectModuleRoutes(enabledModules)` plus `terms`/`privacy` static-page routes. Ensures post-checkout navigation resolves as in the app.
- **`AddressPickerStub`** – Component stub covering both the shipping and billing address pickers. Shipping always emits `addr-1`; billing emits `undefined` when `sameAsShipping` is true, otherwise `billing-1`.
- **`ShippingSelectorStub`** (internal) – Exposes the page's bound value as a `data-selected` attribute and receives `update:modelValue` / `update:requiresAddress` events.
- **`MountedCartPage`** – Interface the spec receives: `wrapper`, the live `cart` store, `selectedShipping()`, and `pickShipping(id, requiresAddress)`.
- **`mountCartPage(held?)`** – Main entry point. Optionally seeds the store with a `CartResponse`, mocks `useProductsStore().fetchProductsByIds → []`, mounts `Cart` with the stubs and plugins, then resolves to a `MountedCartPage` after `flushPromises`.

## Relationships

- **Imported by** every cart-view integration spec: `cart-line-price.spec.ts`, `cart-view-double-submit.spec.ts`, `cart-view-interleavings.spec.ts`, `cart-view-shipping-radio.spec.ts`, `cart-view-stale-refusal.spec.ts`, `cart-view.spec.ts`.
- **Imports** `emitOn` and `nextRenderTick` from `./mounted-vm` for event emission and render-tick waiting.
- **Imports** `Cart.vue`, `useCartStore`, `useProductsStore`, `collectModuleRoutes`, `enabledModules`, `staticPageRouteName`, `i18n`, and `vuetify` to build a production-faithful mount environment.

## Notes

- **Mandatory `vi.mock('@api')`:** Because the store is real, any spec that drives cart operations *must* mock `@api` with `vi.fn()` for each operation. Forgetting this means the store calls the real (unmocked) API client.
- `pickShipping` emits **both** `update:modelValue` and `update:requiresAddress`, then awaits `nextRenderTick` + `flushPromises`. Callers must `await` the returned promise before asserting.
- `selectedShipping()` reads the `data-selected` attribute of the stub; it reflects whatever the page last bound via `v-model`, not an independent source of truth.
- The product store's `fetchProductsByIds` is unconditionally mocked to `[]`; a spec that needs product data must re-mock before or after calling `mountCartPage`.
