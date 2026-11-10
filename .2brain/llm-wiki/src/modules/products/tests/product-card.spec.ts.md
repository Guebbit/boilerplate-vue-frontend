---
source: src/modules/products/tests/product-card.spec.ts
sha256: 10c734184cab8643d62f7d35ec1c20d7fe2eba3d5472e85520c9b8f43ca215e9
signature: 27465622b2d5395dcb7c0ca3c1421c2b517f68a0a1f2563bf7e77bbe898d1a94
generated_at: 2026-11-10T05:24:40.934936+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-card.spec.ts

## Purpose

Vitest unit-test suite for `ProductCard.vue`. Verifies the shopper-facing contracts of the catalogue tile: correct price/currency display, availability badge text and `data-shelf` attribute for every product state (in-stock, out-of-stock, off-sale, preorder, backorder), the single title link to the product page, absence of staff controls, and correct rendering of contributed `product-actions` slot components plus the guest login prompt.

## Key elements

- **`mountCard(product, contributions?)`** – Helper that mounts `ProductCard` with the given product, the real router/Vuetify/i18n plugins, and an optional list of components provided into the `product-actions` slot via `SLOTS_KEY`.
- **`SlotProbe`** – A minimal Vue component (a `<button>` that prints the product `id`) used as a stand-in for contributed action buttons.
- **`router`** – A `createMemoryHistory` router whose routes come from `collectModuleRoutes(enabledModules)`, so `router-link` in the title resolves to the real product-page path.
- **`vi.mock('@/modules/shop')`** – Spreads the real shop module exports and overrides only `backorderPromiseDays` to `ref(30)` so the "ships within 30 days" wording is deterministic.
- **`beforeEach`** – Resets Pinia, loads the `en` locale, and navigates the router to `/en/products` before each test.
- **`describe('ProductCard — what a shopper reads')`** – Price display, all availability states (in-stock, out-of-stock, off-sale, preorder, backorder with/without date), single title link with correct `href`, and absence of `row-edit`/`row-delete` elements.
- **`describe('ProductCard — the contributed actions')`** – Slot contributions receive the product prop, guest sees a login prompt, signed-in user does not.

## Relationships

- **`src/modules/products/components/ProductCard.vue`** – The component under test; imported, mounted, and its DOM output asserted.
- **`tests/support/unit/fixtures.ts`** – Provides the `aProduct(overrides)` factory used to build product fixtures with specific field values.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called at module scope to register enabled modules into the kernel registry so `collectModuleRoutes` and slot infrastructure work in the test environment.

## Notes

- The availability tests assert both the **visible text** and the **`data-shelf` attribute** (e.g. `out-of-stock`, `off-sale`, `preorder`, `backorder`). These attribute values are a DOM-level contract that other code (e.g. list views or analytics) may depend on.
- The `it.each([[3], [undefined]])` test for in-stock explicitly documents that the `inStock` boolean—not the `available` count—determines the "In stock" badge.
- `wireModulesIntoCore()` is called **once at module scope**, not inside `beforeEach`, because it mutates a shared registry.
- The router is not a stub; tests that check `href` depend on the real route tree produced by `collectModuleRoutes(enabledModules)`. If a new module adds routes that change the product path pattern, these assertions will break.
