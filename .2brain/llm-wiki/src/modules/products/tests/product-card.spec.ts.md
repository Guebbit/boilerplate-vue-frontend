---
source: src/modules/products/tests/product-card.spec.ts
sha256: a2f38c0098a864d66cab5652d0d9757423eb7ed7551272177486fabf2c9fbaa5
generated_at: 2026-10-17T01:30:09.289020+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-card.spec.ts

## Purpose

Vitest spec that verifies `ProductCard.vue` presents correct shopper-facing information (price, availability state, title link), renders contributed `product-actions` slots, distinguishes guest from signed-in users, and contains no staff controls.

## Key elements

- **`router`** — A memory-history router built from `collectModuleRoutes(enabledModules)`, so the title link resolves to the real `/en/products/:id` path.
- **`SlotProbe`** — A minimal test component that prints the product's `id`; used as a stand-in contribution in the `product-actions` slot.
- **`mountCard(product, contributions?)`** — Helper that mounts `ProductCard` with the router, vuetify, i18n plugins and a manually provided `SLOTS_KEY` map containing the given slot components.
- **`beforeEach`** — Resets Pinia, loads the `en` locale, and navigates the router to `/en/products` before each test.
- **`describe("ProductCard — what a shopper reads")`** — Asserts price/currency display, availability text and `data-shelf` attribute (out-of-stock, off-sale, preorder, in-stock), that only the title is an `<a>` pointing to the product page, and that no `row-edit`/`row-delete` controls exist.
- **`describe("ProductCard — the contributed actions")`** — Asserts slot contributions render and receive the product, a guest sees a sign-in prompt (`data-test=product-card-login`), and a signed-in shopper does not.

## Relationships

- **`ProductCard.vue`** (sibling component) — The component under test; all assertions target its rendered DOM via `data-test` attributes.
- **`tests/support/unit/fixtures.ts`** — Supplies the `aProduct` factory used to build product objects with specific field overrides.
- **`tests/support/unit/wire-modules.ts`** — Supplies `wireModulesIntoCore()`, called once at module scope to register product-module routes/slots into the kernel so the real router and slot system function in the test environment.

## Notes

- `wireModulesIntoCore()` runs at **module import time**, not per-test — it is a one-time registration, not a per-test fixture.
- The slot mechanism is exercised by injecting `SLOTS_KEY` through Vue's `provide` in the mount options rather than through the real slot registry, keeping the test isolated from other modules' contributions.
- The `it.each([[3], [undefined]])` case on "in stock" explicitly confirms the `inStock` boolean (not the numeric `available` count) drives the displayed state.
- The router uses `createMemoryHistory()`; the `beforeEach` must complete `router.isReady()` before any test asserts on link `href` values.
