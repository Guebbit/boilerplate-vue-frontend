# src/modules/orders/views/Order.vue

## Purpose

Order detail page (`OrderTargetPage`) that renders a single order for both customer and operator roles. It loads the order by route id, guarantees the detail-level `actions` payload is present even when arriving from the list cache, and delegates payment/shipment status to their respective module panels.

## Key elements

- **`cancellable` (computed)** — Reads `currentOrder.actions?.cancel` directly from the server response; never re-derives cancel eligibility client-side.
- **`handleCancel`** — Opens a confirmation dialog via `useDialogStore`, calls `cancelOrder`, toasts success or surfaces API errors.
- **`handleReorder`** — Calls `useCartStore().reorder(orderId)`, then navigates to the Cart route; skipped products are filtered server-side.
- **`heroTitle` / `heroDescription` / `orderStatus` (computed)** — Presentational fallbacks (id → route id → page title; notes → email → empty glyph; status → translated label → `EMPTY_VALUE`).
- **`downloadInvoice`** — Fetches the invoice blob from the store and triggers a client-side PDF download via `downloadBlob`.
- **`watchOrder(() => id)`** — Re-selects and fetches the order whenever the route param changes.
- **`useOrderActionsRefetch(currentOrder, () => id, fetchOrder)`** — Forces a detail re-fetch when the cached row (seeded by the list) lacks `actions`, so the action buttons render for callers arriving from the orders list.
- **`PaymentPanel` / `ShipmentPanel`** — Self-contained published-language components; each re-reads the order when its module advances status and emits `@paid` / `@advanced` to trigger a forced re-fetch.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Transitive dependency reached through `@/infrastructure/utils/errors.ts` (`notifyErrorMessages`) and `@/infrastructure/utils/formatters.ts`; no direct import in this file.

## Notes

- The file deliberately does **not** re-implement order-lifecycle rules. Which actions are available is always read from the server's `actions` object; duplicating that logic locally would desync on the first API change.
- The `useOrderActionsRefetch` call exists specifically because `watchOrder` is cache-first: a row seeded by the list view carries only summary fields and no `actions`. Dropping the forced fetch leaves the page with zero action buttons for list-origin visitors.
- `PaymentPanel` and `ShipmentPanel` own their own data-fetching; this page only listens for their `@paid` / `@advanced` events to refresh the parent order record.
- Component name is `OrderTargetPage` (set in the options script), not `Order`.
