---
source: src/modules/orders/tests/awaiting-transfer-table.spec.ts
sha256: 37647758256f6c1745a21382172e6e50379aa38039ccd1ae01fe55fbc1b8c5e4
generated_at: 2026-10-17T01:16:35.799405+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/awaiting-transfer-table.spec.ts

## Purpose

Unit spec for the `AwaitingTransferTable` component (the "Awaiting transfer" tab on the payments page). It pins the queue rendering, the record-payment dialog lifecycle, and the reload-after-recording behavior, while the form itself is stubbed out (its own spec covers recording logic).

## Key elements

- **`mountTab(orders?)`** — Mounts `AwaitingTransferTable` with Pinia, Vuetify, i18n, and the real router; stubs `RecordOfflinePaymentForm` and `VDialog` as lightweight template components; returns `{ wrapper, read }` where `read` is a spy on `store.fetchAwaitingTransfers`.
- **`OWED`** — Two sample `Order` objects (one with a `payBy` deadline, one without) used as the default queue.
- **`router`** — Module-level `createRouter` with `createMemoryHistory` and the full module route tree, so `router-link` hrefs to `/orders/:id` resolve correctly.
- **`describe('AwaitingTransferTable')`** — Five cases covering: row rendering (number, customer, total, deadline/dash), empty-state message, row click opens the form for that order only, `recorded` event triggers reload + dialog close, and close-button dismisses the dialog without reloading.

## Relationships

- **`AwaitingTransferTable.vue`** — The component under test; mounted directly via `mount()`.
- **`store.ts`** — `useOrdersStore` is instantiated per test; `fetchAwaitingTransfers` is spied and its implementation replaced so assertions can verify call count/args.
- **`tests/support/unit/fixtures.ts`** — Provides the `anOrder` factory used to build the `OWED` fixture data.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn`, used to fire the `recorded` event on the stubbed form component.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope so the registry (and therefore `collectModuleRoutes`) is populated before the router is created.

## Notes

- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`; the router is also module-level. Resetting Pinia is done per test via `setActivePinia(createPinia())`.
- `VDialog` is stubbed as an inline `<div v-if="modelValue"><slot/></div>` to sidestep Vue's teleport behavior in the test DOM.
- The `read` spy's mock implementation directly assigns `store.awaitingTransfers` and `store.awaitingTransfersTotal` rather than calling a real network layer, so no HTTP mocking is needed.
- The spec explicitly documents that the offline form is stubbed and its own spec covers the recording flow—do not add recording assertions here.
