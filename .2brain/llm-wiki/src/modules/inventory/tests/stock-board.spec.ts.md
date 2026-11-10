---
source: src/modules/inventory/tests/stock-board.spec.ts
sha256: 5e57b8ccd326d1abe2d91c7ff6f0577a36e171329c933a57245287fb8fbb7466
signature: f98749a821c868092a249e90d5bcc11181ff30e9ce0853b87eb9b7c63ab7bc6d
generated_at: 2026-11-10T04:36:05.112322+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/stock-board.spec.ts

## Purpose

Vitest spec that verifies the `StockBoard` component's backorder (preorder) columns: that limit and outstanding values render, that the limit-edit control is gated behind the `update:StockLevel` ability, and that clicking the control opens `BackorderLimitDialog` bound to the correct row.

## Key elements

- **`mountBoard(rows, abilities)`** – Local helper that populates a fresh session (admin role, `test-token`, given ability pairs), spies on `inventory.fetchLevels` to return the supplied `InventoryLevel[]`, builds a memory-history router, and mounts `StockBoard` with Vuetify, i18n, and the router as plugins. Returns the `wrapper`.
- **`describe('StockBoard preorder columns')`** – Contains three tests:
  - *Shows limit & outstanding* – Asserts the row text includes the backorder limit (`10`) and outstanding count (`4`), and the header label "Backorder limit" is present.
  - *Permission gating* – Mounts with `read` only (expects no `[data-test=level-backorder-limit]`), then re-mounts with `read` + `update` (expects the element to exist).
  - *Dialog opens on the correct row* – With two levels, clicks the second row's button and asserts `BackorderLimitDialog` receives a `level` prop matching `productId: 'p2'`.
- **`beforeEach`** – Resets Pinia (`createPinia`) and loads the `en` locale.

## Relationships

- **`src/modules/inventory/components/StockBoard.vue`** – The component under test; mounted directly via `mount(StockBoard, …)`.
- **`src/modules/inventory/components/BackorderLimitDialog.vue`** – Imported to locate it inside the rendered tree and assert on its `level` prop after a click.
- **`src/modules/inventory/store.ts`** – `useInventoryStore` is pulled from the active Pinia instance; `fetchLevels` is spied to inject fixture data.
- **`tests/support/unit/fixtures.ts`** – Provides `aLevel()`, a factory that returns a typed `InventoryLevel` with overridable fields.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module load to register module-level dependencies needed by the components.

## Notes

- `wireModulesIntoCore()` runs at **module scope**, not inside `beforeEach`; it is assumed idempotent and needs only one call per test-file process.
- The permission-gating test creates a *second* Pinia instance mid-chain (`setActivePinia(createPinia())`) before mounting the "writer" variant, so the two mounts never share store state.
- Async handling uses `.then()` chaining over `flushPromises()` rather than `async/await`; adding a new assertion step means appending another `.then` link.
- The `abilities` parameter is typed as `[string, string][]` (action + subject pairs) matching the session store's ability model; both `tenant`-scoped abilities are used, `platform` is left empty.
