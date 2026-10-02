---
source: src/modules/products/tests/product-card.spec.ts
sha256: cfb2f5d7c06a343092d7b5f95e68f339b011d66f2640318fefd6188d8ba5c21d
generated_at: 2026-10-02T15:34:49.719105+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-card.spec.ts

## Purpose

Vitest spec for `ProductCard.vue`, verifying the shopper-facing contract: correct price and availability rendering, the title as the sole product-page link, contributed `product-actions` slot wiring, guest sign-in prompting, and the absence of staff controls.

## Key elements

- **`router`** — a `createMemoryHistory` router built from `collectModuleRoutes(enabledModules)`; used so the title link resolves to the real `/en/products/:id` path rather than a stub.
- **`SlotProbe`** — a minimal `defineComponent` that renders `product.id`; stands in for any contributed action to verify the card passes the product object through.
- **`mountCard(product, contributions?)`** — mounts `ProductCard` with the real router, Vuetify, and i18n plugins, and injects `contributions` via the kernel `SLOTS_KEY` provide under the `'product-actions'` key.
- **`beforeEach`** — resets Pinia, loads the `en` locale, and pushes the router to `/en/products` so `router.isReady()` resolves.
- **`describe('ProductCard — what a shopper reads')`** — asserts price/currency text, out-of-stock vs in-stock (including `available: undefined` → in stock), single `<a>` linking to `/en/products/:id`, and no `row-edit`/`row-delete` elements.
- **`describe('ProductCard — the contributed actions')`** — asserts slot contributions receive the product, a guest sees a login prompt, and a signed-in shopper does not.

## Relationships

- **`tests/support/unit/fixtures.ts`** — imports the `aProduct` factory to build product fixtures inline (e.g. `aProduct({ price: 120, currency: 'EUR' })`).
- **`tests/support/unit/wire-modules.ts`** — imports `wireModulesIntoCore()`, called once at module top-level to register module slots into the kernel registry before any test runs.

## Notes

- `wireModulesIntoCore()` is invoked at import time, not inside a hook; it is a one-time side-effect that makes the slot registry available to the component under test.
- Slot contributions are injected through the kernel `SLOTS_KEY` provide, not Vue's native `<slot>` mechanism — the test is exercising the app's own contribution protocol.
- `available: undefined` is explicitly tested as equivalent to a positive count (both render "In stock"); a missing field is treated as "unconstrained," not zero.
- The test uses the **real** app router (memory history + actual module routes), so the href assertion (`/en/products/p9`) depends on route definitions in the products module being correct.
