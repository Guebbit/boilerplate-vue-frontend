---
source: src/modules/inventory/tests/preorders-board-view.spec.ts
sha256: f5cc5a930015b2bfbf8d5beff3f7aa3ffdbe10ad0e27210eeccbc0680773bae8
generated_at: 2026-10-17T01:01:11.884704+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorders-board-view.spec.ts

## Purpose

Unit tests for the staff preorder board page (`PreordersBoard.vue`). Verifies which tabs a viewer sees based on their abilities (stock readers get both tabs; orders-only readers get just the orders tab), how the `tab` and `productId` query params land in and leave the URL, and the event-driven hand-off from the products tab to the orders tab. Tab bodies are stubbed, so assertions target only the data passed to them and the resulting route state.

## Key elements

- **`router`** – A real Vue Router (memory history) built from `collectModuleRoutes(enabledModules)`, so the actual registered route tree is exercised.
- **`STUBS`** – Replacements for `PreorderProductsTable` and `PreorderFulfillmentTable`. The fulfillment stub echoes `productId`/`productLabel` into `data-*` attributes for assertion.
- **`mountAt(url, abilities)`** – Sets up the Pinia session (admin viewer, given ability pairs), pushes the URL on the shared router, mounts `PreordersBoard` with the router/Vuetify/i18n plugins and the stubs, then flushes.
- **`BOTH`** – Shorthand ability list (`read Order`, `read StockLevel`) used by most tests.
- **`describe('PreordersBoard tabs')`** – Asserts tab count/visibility per ability set and that the `?tab=` query param selects the initial tab and is removed on click.
- **`describe('PreordersBoard product filter')`** – Asserts `?productId=` is received by the orders body, that a `showOrders` event from the products stub switches the tab and writes `tab`+`productId` to the URL, and that a `clearProduct` event removes both the prop and the query param.

## Relationships

- **`src/modules/inventory/views/PreordersBoard.vue`** – The component under test; mounted directly and its emitted events / route writes are the primary assertions.
- **`tests/support/unit/mounted-vm.ts`** – Supplies the `emitOn` helper used to simulate `showOrders` and `clearProduct` events on the stubbed child components.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore()`, called once at module scope to register inventory routes before the shared router is created.

## Notes

- `wireModulesIntoCore()` runs at import time (top-level), not inside `beforeEach`, so module registration happens exactly once per test-file load.
- The router is a single shared instance across all tests in the file; each `mountAt` call pushes a new URL on it. Tests must therefore not assume a clean initial route.
- `session.setAbilities` is called per-mount with tenant-level abilities; the `platform` array is always empty. Tab visibility is driven entirely by these tenant abilities.
- Because tab bodies are stubs, any internal logic *inside* `PreorderProductsTable` or `PreorderFulfillmentTable` is not covered here—only the parent's wiring of props and events.
