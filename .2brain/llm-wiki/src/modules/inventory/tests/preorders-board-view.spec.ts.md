---
source: src/modules/inventory/tests/preorders-board-view.spec.ts
sha256: f5cc5a930015b2bfbf8d5beff3f7aa3ffdbe10ad0e27210eeccbc0680773bae8
signature: 2804ad13044ea7a7896d1c46aad3466712965d9f4f802a7e4512721bb6d1053f
generated_at: 2026-11-10T04:35:13.216381+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorders-board-view.spec.ts

## Purpose

Vitest spec for the staff PreordersBoard view. It verifies three behaviors without touching the actual table internals: which tabs appear based on the viewer's abilities (stock read vs. orders read), how the active tab and product filter are read from / written to the URL query string, and the `showOrders` / `clearProduct` hand-off between the two tabs.

## Key elements

- **`mountAt(url, abilities)`** — Sets a fake session (token, viewer, abilities), pushes the URL on a real router, mounts `PreordersBoard` with stubbed children, and returns the wrapper after `flushPromises`.
- **`STUBS`** — Replaces `PreorderProductsTable` and `PreorderFulfillmentTable` with minimal `data-test` marker divs so assertions target the board's wiring, not the tables' internals.
- **`BOTH`** — Convenience ability list granting `read Order` + `read StockLevel`.
- **`describe('PreordersBoard tabs')`** — Asserts tab visibility per ability set and that the `?tab=` query param both lands on the correct tab and is cleared on a tab click.
- **`describe('PreordersBoard product filter')`** — Asserts that `?productId=` is passed to the orders body, that a `showOrders` event on the products stub navigates to `?tab=orders&productId=…`, and that a `clearProduct` event removes the product from both the DOM and the query string.

## Relationships

- **`src/modules/inventory/views/PreordersBoard.vue`** — The component under test; mounted directly with its real route and real router.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope so `collectModuleRoutes(enabledModules)` can build the real route tree for the test router.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn`, used to dispatch `showOrders` and `clearProduct` on the stubbed child components.

## Notes

- The router is a **real** `createRouter` with `createMemoryHistory`, not a mock; route definitions come from `collectModuleRoutes(enabledModules)`, so route shape changes in the module registry will surface here.
- `wireModulesIntoCore()` runs at the **top of the module**, not in `beforeEach`; it is idempotent by design but should not be called again in other tests in the same worker.
- All assertions are Promise-chained (`.then()`), not `async/await`; follow the same style when extending the file.
- Because both tab bodies are stubbed, this spec does **not** exercise any logic inside `PreorderProductsTable` or `PreorderFulfillmentTable`; those are covered by their own specs.
