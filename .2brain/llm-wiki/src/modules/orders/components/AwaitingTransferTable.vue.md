---
source: src/modules/orders/components/AwaitingTransferTable.vue
sha256: 77d0e025fd21bd5bf9b74c72ed9f3da22aeaeac6ec52ae2466450feaccf18ec5
generated_at: 2026-10-17T01:14:39.964148+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/components/AwaitingTransferTable.vue

## Purpose

Renders the "Awaiting transfer" tab of the payments page (contributed via the `payments-awaiting-transfer` slot). It displays a paginated table of **orders** that are still waiting for a bank-transfer payment to be recorded by an admin — no `Payment` record exists yet for these. Each row exposes a "Record" action that opens the payments module's offline recording form in a dialog.

## Key elements

- **Component name** (`AwaitingTransferTable`) — declared in a separate `<script>` block so `<KeepAlive>` / DevTools can identify it; `<script setup>` cannot set `name` itself.
- **`load()`** — calls `store.fetchAwaitingTransfers(page, 10)`; on failure toasts via `notifyErrorMessages`.
- **`page` / `pageTotal`** — 1-based pagination state (10 rows/page); `pageTotal` is derived from `awaitingTransfersTotal`.
- **`headers`** — computed array of `CoreDataTableHeader<Order>`: order number, email, total, pay-by date, actions. All marked `synthetic: true` (rendered via slots).
- **`openRecord(order)` / `handleRecorded()`** — open the `RecordOfflinePaymentForm` dialog for a given order; on successful recording, closes the dialog and reloads the list.
- **Template slots** — order number renders a `router-link` to the order detail; `totalPrice` uses `formatCurrency`; `payBy` uses `formatDateTime` with an `EMPTY_VALUE` fallback.
- **`RecordOfflinePaymentForm`** — imported from `@/modules/payments`; the cross-module component that actually creates the payment record.

## Relationships

- **`src/modules/orders/store.ts`** — primary data source. The component reads `awaitingTransfers`, `awaitingTransfersTotal`, `loading` (via `storeToRefs`) and calls `fetchAwaitingTransfers(page, pageSize)`.
- **`src/modules/orders/tests/awaiting-transfer-table.spec.ts`** — unit test for this component.
- **`src/infrastructure/utils/logger.ts`** — not imported directly by this file; error toasting goes through `notifyErrorMessages` (from `utils/errors.ts`) and `useNotificationsStore` (vue-toolkit), which may delegate to the logger internally.

## Notes

- This table lists **orders**, not payments. A payment row only appears after an admin records the incoming transfer.
- The hold window (`NODE_BANK_TRANSFER_HOLD_HOURS`) is enforced server-side; the client only displays whatever the API returns.
- `data-test="payments-awaiting"` on the root div is the hook tests and e2e scripts target for this tab.
- The component is designed to be **slot-injected** into a parent payments page, not rendered standalone in a route.
