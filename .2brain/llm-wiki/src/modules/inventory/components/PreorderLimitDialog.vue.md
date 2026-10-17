---
source: src/modules/inventory/components/PreorderLimitDialog.vue
sha256: 9e184476e125712f251318062fc5b1341b36e623d4df6e37808c2f4be132b319
generated_at: 2026-10-17T00:57:49.672571+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/PreorderLimitDialog.vue

## Purpose

A Vuetify dialog that lets staff set the absolute maximum number of units that can be preordered for a single product. A value of `0` closes preordering entirely; setting a limit below the current outstanding preorders does not cancel existing orders—it only blocks new ones. The dialog owns its open/close state (via `v-model`), seeds its input from the provided `InventoryLevel` row, and handles both success (toast + close) and failure (inline error) locally.

## Key elements

- **`props.level: InventoryLevel`** – The stock-board row being edited; supplies the product title (for the heading) and the current `preorderLimit` / `preordered` values (for seeding the field and the hint text).
- **`isOpen: ModelRef<boolean>`** – Two-way binding that controls dialog visibility; the parent toggles it.
- **`limit: Ref<number | undefined>`** – The value being typed. `undefined` means the field is empty and blocks submission.
- **`submit()`** – Calls `inventoryStore.setLimit(productId, limit)`. On success dispatches a notification and closes the dialog; on failure feeds the error into `useBlockingError` so it renders in-place via `InlineErrorAlert`.
- **`useBlockingError()`** – Local error state (`limitError`, `reportLimitError`, `clearLimitError`) that drives the inline alert without closing the dialog.
- **`useFullscreenDialog()` / `useReturnFocus()`** – Responsive fullscreen on small screens; restores focus to the trigger element on close.
- **`watch(isOpen)`** – Resets `limit` to `level.preorderLimit` and clears any prior error every time the dialog reopens.

## Relationships

- **`src/modules/inventory/store.ts`** – Direct import. The component reads `loading` (via `storeToRefs`) to disable the save button and calls `inventoryStore.setLimit(productId, value)` on submit.
- **`src/modules/inventory/components/StockBoard.vue`** – Parent/consumer. Renders this dialog per row, passes the `InventoryLevel` as the `level` prop, and controls `isOpen` via `v-model`.
- **`src/modules/inventory/tests/preorder-limit-dialog.spec.ts`** – Unit-test suite for this component's behavior (open/reset, submit success, submit failure, disabled states).
- **`src/modules/inventory/tests/stock-board.spec.ts`** – Tests the parent board; likely exercises the dialog through StockBoard's rendering.

## Notes

- `logger.ts` appears in the dependency graph but is **not** imported by this file; no logging call is made here.
- The submit guard `limit.value === undefined` means the form's `novalidate` + button `:disabled` are the only input validations; there is no min/max validation beyond `v-number-input`'s `:min="0"`.
- The `watch` only acts on the `true` transition (dialog opening); closing does not reset the field, so a cancel leaves the last-typed value until the next open.
- The hint text (`level.preordered`) is static per dialog instance and will not update if another order ships between opening and saving.
