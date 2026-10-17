---
source: src/modules/inventory/tests/stock-board.spec.ts
sha256: 1bff2a5ffdbb6618331ebd8f88611cf3e2f8db22e6308a2be832c71b8c9f01f3
generated_at: 2026-10-17T01:01:30.744782+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/stock-board.spec.ts

## Purpose

Unit tests for `StockBoard.vue` covering the preorder-limit columns and the ability-gated limit control. Verifies that the limit/outstanding numbers render, that the edit button appears only to holders of `create:StockMovement`, and that pressing the button opens `PreorderLimitDialog` scoped to the correct row.

## Key elements

- **`mountBoard(rows, abilities)`** – Test helper. Sets up a fake session (token, admin viewer, ability list), spies on `inventory.fetchLevels` to resolve the given rows, builds a memory-history router, and mounts `StockBoard` with vuetify, i18n, and router plugins.
- **`describe('StockBoard preorder columns')`** – Suite containing three tests:
  - *shows each product's limit and what is outstanding* – asserts the row text includes the limit and preordered values plus the column header.
  - *offers the limit control to a holder of the stock write only* – mounts with read-only abilities (button absent), then remounts with `create:StockMovement` added (button present).
  - *opens the dialog on the row whose button was pressed* – clicks the second row's button and asserts `PreorderLimitDialog` receives `level` with `productId: 'p2'`.
- **`beforeEach`** – Activates a fresh Pinia instance and loads the `en` locale.

## Relationships

- **`../components/StockBoard.vue`** – Component under test; mounted directly.
- **`../components/PreorderLimitDialog.vue`** – Asserted via `wrapper.findComponent` to verify it receives the correct `level` prop.
- **`../store.ts`** (`useInventoryStore`) – `fetchLevels` is spied/mocked so the component renders pre-seeded rows without a network call.
- **`tests/support/unit/fixtures.ts`** (`aLevel`) – Factory used to build `InventoryLevel` objects with optional overrides.
- **`tests/support/unit/wire-modules.ts`** (`wireModulesIntoCore`) – Called once at module scope to register DI modules so stores resolve correctly in the test runtime.

## Notes

- The second test swaps the active Pinia instance **mid-async-chain** (after the first `flushPromises`) to simulate a different ability set. This is intentional but fragile: both mounts share the same component tree in the wrapper.
- `wireModulesIntoCore()` runs at **import time** (top-level), not inside `beforeEach`. If the module graph changes, this must still execute before any store is accessed.
- `beforeEach` returns `loadLocale('en')` (a promise). Vitest awaits it, but if it ever becomes synchronous the `return` is a no-op — worth noting if refactoring the locale loader.
