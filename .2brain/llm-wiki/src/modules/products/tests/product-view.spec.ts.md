---
source: src/modules/products/tests/product-view.spec.ts
sha256: b07e28e2af3b98a9490e79408a6f501573fef7c75828a2d97f2892838acd3e1f
generated_at: 2026-10-02T15:38:36.078406+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-view.spec.ts

## Purpose
Unit-test spec for the `Product` detail view. It mounts the real component against a real (memory-history) router built from `collectModuleRoutes`, then exercises every product shape the API can return—out-of-stock, in-stock, minimal, rich, ability-gated—without a network fetch or database. The pattern mirrors `wishlist-view.spec.ts`.

## Key elements
- **`router`** — A `vue-router` instance using `createMemoryHistory` over the same route tree the app builds (`collectModuleRoutes(enabledModules)`), scoped under `/:locale`.
- **`SlotProbe`** — Minimal component that renders `product.id`; injected into the `product-actions` slot to verify that contributed components receive the correct product object.
- **`mountProduct(product, contributions?)`** — Central mount helper: stubs `watchProduct` via `vi.spyOn` → `noopWatchHandle()`, seeds the product into the store, sets `selectedProductId`, then mounts `Product` with router, Vuetify, i18n, and a `SLOTS_KEY` provide. Returns the Vue Test Utils wrapper.
- **`signInWith(tenant)`** — Sets `useSessionStore` abilities for the current tenant and a fixed viewer, used to test the edit-button guard.
- **Test suites** — "the shelf" (stock / out-of-stock text), "the product-actions slot" (rendering and empty-slot behaviour), "a barebones product" (description fallback glyph `—`), "the edit button" (visibility gated by `update Product` ability).

## Relationships
- **`tests/support/unit/wire-handle.ts`** — Provides `noopWatchHandle`, returned by the `watchProduct` spy so the store's reactive fetch loop never fires during the test.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called once at module scope to register module slot contributions into the kernel before any test runs.

## Notes
- `SLOTS_KEY` is an `InjectionKey` (typed symbol); the mount `provide` map requires a plain symbol, hence the `as symbol` cast in `mountProduct`.
- `wireModulesIntoCore()` executes at import time, not inside a `beforeEach`; it is idempotent but must run before the first mount.
- The "barebones product" block documents that the shape it asserts (no description, no categories, no tags) previously lived as an unused `ProductRole: 'minimal'` constant in the e2e suite; this spec is the sole consumer now.
- `beforeEach` resets Pinia and advances the memory router to `/en/products/placeholder`, so every test starts from a clean navigation state.
