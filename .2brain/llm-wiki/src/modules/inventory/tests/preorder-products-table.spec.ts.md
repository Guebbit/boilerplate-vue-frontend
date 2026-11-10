---
source: src/modules/inventory/tests/preorder-products-table.spec.ts
sha256: 617baba14fbb277a0e4bdce972b28c7823c349c955d354fd82437c56e18868c6
signature: 5a7aa610791d2e24d6da6ac7bb2fb924bc874d88db9437fa6ee41f2479665b2d
generated_at: 2026-11-10T04:34:43.268825+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorder-products-table.spec.ts

## Purpose

Unit tests for `PreorderProductsTable.vue`, the first tab of the preorders board. They verify the on-screen join of two API reads (preorder allowance levels and fulfillment-order summaries): rendering of limits/outstanding/splits, state-count chips (only non-zero states, late flagged), the "show orders" hand-off event, and the permission-gated release-date edit link.

## Key elements

- **`answers`** — module-level mutable object holding the two stubbed HTTP responses keyed by URL (`/inventory/preorders`, `/delivery/fulfillment-orders/summary`).
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` so every transport call returns the value in `answers`, validated through `parseOrvalFixture`.
- **`router`** — a real `vue-router` instance built from `collectModuleRoutes(enabledModules)`; ensures the product-edit link resolves against the actual route tree.
- **`mountTable(levels, summaries, abilities?)`** — helper that configures the session store (token, viewer, abilities), populates `answers`, mounts the component with router/vuetify/i18n plugins, and returns the wrapper after `flushPromises`.
- **`beforeEach`** — creates a fresh Pinia, navigates to `/en/sales/preorders`, and loads the `en` locale.
- **Six `it` cases** covering: allowance numbers (limit, outstanding, split, remaining); state-count chips (non-zero only, late flagged); a product with no allowance row; the empty-state message; the `showOrders` emit; and the write-permission gate on the release-date link (double-mount: with `['update','Product']` then without).

## Relationships

- **`PreorderProductsTable.vue`** — the component under test; mounted directly via `mount()`.
- **`tests/support/unit/fixtures.ts`** — supplies `aPreorderLevel` and `aPreorderSummary` factory functions used to build stub payloads.
- **`tests/support/unit/orval-fixture-schema.ts`** — supplies `parseOrvalFixture`, which validates/normalises the raw stub data before it is returned as the mocked HTTP response.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load to register inventory (and other) modules into the core registry, making `collectModuleRoutes` produce a complete route tree for the router.

## Notes

- The HTTP transport is the sole seam; neither the inventory store nor the delivery store is accessed or spied on directly.
- The router is intentionally the *real* module route tree (not a minimal stub) so that the product-edit `href` assertion (`/en/products/p1/edit`) is meaningful.
- The permission-gate test performs two separate mounts (with and without the `['update','Product']` ability), resetting Pinia between them.
- All DOM queries use `data-test` or `data-count` attributes rather than class names.
