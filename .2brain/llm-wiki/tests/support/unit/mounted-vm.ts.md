---
source: tests/support/unit/mounted-vm.ts
sha256: 9da5394a047bc11bb42fec362ee038134ba804c0d808892d39d1600474d06a84
signature: b93b9847966c3b191501733f9d0c7265b23726b7b3883136b2cd82c3ca8afb17
generated_at: 2026-11-10T07:42:00.875434+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/mounted-vm.ts

## Purpose

Provides two small typed wrappers around `@vue/test-utils`'s `wrapper.vm` so that the `ComponentPublicInstance` cast happens in exactly one place. Without this, every unit test that calls `.vm.$nextTick()` or `.vm.$emit()` would need an ad-hoc cast, because TypeScript-ESLint cannot reliably resolve a `.vue` SFC's instance type through `VueWrapper`.

## Key elements

- **`HasVm`** (private interface) — minimal structural type (`{ vm: unknown }`) that both `mount()` and `findComponent()` return values satisfy; the only contract these helpers require.
- **`nextRenderTick(wrapper: HasVm): Promise<void>`** — typed pass-through to `wrapper.vm.$nextTick()`; use in place of an untyped `.vm.$nextTick()` call.
- **`emitOn(wrapper: HasVm, event: string, ...arguments_: unknown[]): void`** — typed pass-through to `wrapper.vm.$emit(event, ...args)`; intended for triggering a child component's declared emit directly instead of simulating the full DOM interaction.

## Relationships

- Consumed by unit-test specs across multiple modules: `address-picker.spec.ts` (account), `add-to-cart-button.spec.ts` and `cart-view.spec.ts` (cart), `fulfillment-order-card.spec.ts`, `hold-dialog.spec.ts`, `report-lost-dialog.spec.ts`, `ship-items-dialog.spec.ts`, `shipment-panel.spec.ts`, and `shipment-row.spec.ts` (delivery), `backorder-limit-dialog.spec.ts` and `preorders-board-view.spec.ts` (inventory), `entries-import-dialog.spec.ts` (locales), and `order-edit-view.spec.ts` and `order-view.spec.ts` (orders).
- `src/modules/cart/tests/mount-cart-page.ts` is the only non-spec neighbor; it composes these helpers when wiring up a mounted cart page for other tests to consume.

## Notes

- The `HasVm` interface is intentionally not exported. Callers pass whatever `VueWrapper` they already have; structural typing does the rest.
- `emitOn` accepts `...arguments_: unknown[]` (note the trailing underscore to avoid shadowing the global `arguments`). This means there is **no** compile-time check that `event` matches a declared emit or that the payload shape is correct — the caller is responsible for correctness.
- These helpers exist purely to suppress a TypeScript-ESLint unsafety lint rule around SFC instance types; they add no runtime behavior beyond the original `vm` calls.
