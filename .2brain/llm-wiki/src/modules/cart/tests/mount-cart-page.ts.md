---
source: src/modules/cart/tests/mount-cart-page.ts
sha256: e054d0f54ad8902fd660f6700d55f9052173b5bde33266fa7aa51be69c2a52be
signature: 68846a809858cda41d52c364408c5ff18beed5c59474322043db57aab47f6f8a
generated_at: 2026-11-10T04:09:10.015391+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/mount-cart-page.ts

## Purpose

Test helper that mounts the real `SignedInCart` page against the real cart store, holding only the network boundary for the calling spec to mock. It exists for specs that need to observe store-and-page interactions (interleavings, double-submit, stale-refusal) rather than isolated render output.

## Key elements

- **`router`** — A memory-history Vue Router scoped to `enabledModules` routes plus `StaticTerms` / `StaticPrivacy` stubs, so post-checkout navigation resolves identically to the app.
- **`AddressPickerStub`** — Stands in for both shipping and billing address pickers. Emits `addr-1` for shipping; emits `undefined` (same-as-shipping) or `billing-1` for billing based on the `sameAsShipping` prop.
- **`ShippingSelectorStub`** (internal) — Renders a `data-selected` attribute reflecting its `modelValue`; lets a test read the page's current binding without parsing DOM.
- **`MountedCartPage`** (interface) — The shape returned to specs: `wrapper`, `cart` (real store instance), `selectedShipping()`, and `pickShipping(id, requiresAddress)`.
- **`mountCartPage(held?)`** (main export) — Optionally pre-loads a cart, spies on product reads and `fetchProfile`, mounts `SignedInCart` with Vuetify/i18n/router plugins and the three child-component stubs, flushes promises, and returns a `MountedCartPage`.

## Relationships

- **`src/modules/cart/components/SignedInCart.vue`** — The component under test; this file mounts it directly.
- **`src/modules/cart/store.ts`** — Imported as `useCartStore`; kept *real* (not stubbed), which is the point of this helper vs. the page's own specs.
- **`src/modules/cart/tests/cart-view.spec.ts`**, **`cart-view-double-submit.spec.ts`**, **`cart-view-interleavings.spec.ts`**, **`cart-view-shipping-radio.spec.ts`**, **`cart-view-stale-refusal.spec.ts`**, **`cart-line-price.spec.ts`** — Consumer specs that import and call `mountCartPage` to obtain a fully wired page instance.
- **`tests/support/unit/mounted-vm.ts`** — Supplies `emitOn` (event dispatch on a child) and `nextRenderTick` (flush Vue's update cycle) used inside `pickShipping`.

## Notes

- A spec that uses this helper must mock the network seam it drives; the store is real and will attempt real API calls otherwise.
- `useAccountProfileStore().fetchProfile` is spied here because the page reads the account on mount; without the spy the dev server (or anything on the API port) returns junk, the viewer resets, and the cart clears.
- The router is re-created per file (module-level `const`), not per test; tests share this single router instance.
- `collectModuleRoutes(enabledModules)` pulls routes from the kernel registry; the two static-page routes are hand-written because the test harness cannot import from the app tier.
