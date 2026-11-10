---
source: src/modules/inventory/components/BackorderLimitDialog.vue
sha256: 5fa03e783eb8d59588431615ef3035a6e1b309bd573f10facf6ee3e6ff62deb3
signature: 5fa03e783eb8d59588431615ef3035a6e1b309bd573f10facf6ee3e6ff62deb3
generated_at: 2026-11-10T04:29:43.776746+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/BackorderLimitDialog.vue

## Purpose

A modal dialog that lets a staff member set (or clear) the maximum backorder quantity for a single product. It supports a numeric cap (`0` = refuse all new backorders) or an "unlimited" mode that removes the cap entirely. Errors from the save call are surfaced inline in the dialog rather than as toasts.

## Key elements

- **`props.level: InventoryLevel`** — the board row being edited; provides `productId`, `title`, current `backorderLimit`, and `backordered` (outstanding count for the hint).
- **`isOpen: Model<boolean>`** — two-way `v-model` controlling visibility; the parent toggles it.
- **`unlimited` / `limit` refs** — mutually exclusive inputs. `unlimited === true` means "no cap"; otherwise `limit` holds the numeric value (or `undefined` while the field is empty).
- **`watch(isOpen)`** — re-seeds `limit` and `unlimited` from the prop and clears any prior inline error every time the dialog opens.
- **`submit()`** — calls `inventoryStore.setLimit(productId, value)`. On success: toast + close dialog. On rejection: `reportLimitError(error)` populates the inline `InlineErrorAlert`.
- **`useBlockingError()`** — local error state (`limitError`, `reportLimitError`, `clearLimitError`) for in-place error display.
- **`loading` (from `storeToRefs`)** — disables the submit button while *any* inventory call is in flight.

## Relationships

- **`src/modules/inventory/store.ts`** — imports `useInventoryStore`; calls `setLimit(productId, null | number)` and reads the shared `loading` flag.
- **`src/modules/inventory/components/StockBoard.vue`** — renders this dialog per row, passing the row's `InventoryLevel` as `level` and controlling `isOpen` via `v-model`.
- **`src/modules/inventory/tests/backorder-limit-dialog.spec.ts`** — unit/integration tests targeting this component directly.
- **`src/modules/inventory/tests/stock-board.spec.ts`** — tests the board; may mount or exercise this dialog as part of board-level interaction tests.

## Notes

- "Unlimited" sends `null` to the store (not a sentinel number). A limit of `0` is a valid, distinct value meaning "refuse all new backorders."
- Setting a limit *below* the current outstanding (`backordered`) does **not** cancel existing orders; only new backorders are refused. The hint text in the template communicates this.
- The submit button is disabled when `!unlimited && limit === undefined` (empty field) **or** while the store's global `loading` flag is true, so any in-flight inventory call blocks saves from this dialog.
- Errors use `InlineErrorAlert` (in-place), not a toast; only *success* triggers a toast via `useNotificationsStore`.
