# src/modules/inventory/components/StockMovementForm.vue

## Purpose

A reusable stock-movement form that handles two distinct domain writes—receipt (add stock) and adjustment (signed delta, e.g. shrinkage)—by branching on a `mode` prop rather than a runtime sign toggle. This design prevents a mis-click from silently converting a delivery into a correction (or vice-versa).

## Key elements

- **`props.mode`** (`'receipt' | 'adjust'`) — the only runtime differentiator; every label, schema, and store call branches on it.
- **`schema`** (computed Zod object) — validates `productId`, `amount`, and `note`. For receipts, `amount` must be a positive integer ≥ 1; for adjustments, it must be a non-zero integer (positive or negative).
- **`useAppForm`** — owns field state (`form`), error display (`formErrors`, `showFormErrors`), and submit gating (`handleSubmit`). Seeded with a mode-appropriate default amount (`10` for receipt, `-1` for adjust).
- **`submitForm`** — validates via `handleSubmit`, then dispatches to `inventoryStore.receive` or `inventoryStore.adjust` depending on mode. On success it fires a toast, clears the note field, and re-fetches the product catalogue. On failure it routes the error through `notifyErrorMessages`.
- **`productOptions`** — maps `productsList` into `{ value: id, title }` pairs for the `<v-select>`.
- **`loading`** (from `inventoryStore`) — disables the submit button while a write is in flight.

## Relationships

- **`useAppForm`** (`@/infrastructure/composables/use-app-form.ts`) — provides form state, Zod-schema-driven validation, and the `handleSubmit` wrapper that gates the submit action.
- **`useInventoryStore`** (`@/modules/inventory/store.ts`) — exposes `receive`, `adjust`, and a `loading` flag.
- **`useProductsStore`** (`@/modules/products`) — supplies the product catalogue and its `fetchProducts` refetch, keeping the catalogue's local counter copies in sync after each write.
- **`notifyErrorMessages`** (`@/infrastructure/utils/errors.ts`) — formats and dispatches API error messages to the notifications store; carries server-side 409 copy verbatim.
- **`useNotificationsStore`** (`@guebbit/vue-toolkit`) — provides `addMessage` for success toasts and error surfacing.
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but no direct import or call is visible in this file's source.

## Notes

- The component is expected to be **instantiated twice** in the parent (once per mode), not toggled at runtime. Each instance gets its own `data-test` prefix (`receipt-*` vs `adjust-*`) and button color (`primary` vs `secondary`).
- The note field is optional (`note || undefined` is passed to the store), but the Zod schema requires it to be a string (empty string passes).
- After a successful write, `productsStore.fetchProducts()` is called because the products store maintains its own cached copy of stock counters independent of the inventory store.
- The adjustment 409 case (correction would drive available stock below reserved units) is intentionally surfaced with the server's message text; the client does not rewrite it.
