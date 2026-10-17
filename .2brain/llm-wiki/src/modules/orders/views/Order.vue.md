---
source: src/modules/orders/views/Order.vue
sha256: 5654257061d37090f7e3c3bbd72ef8525d89c2d90eaab14a3e9e3ea8ee978c9b
generated_at: 2026-10-17T01:20:10.809421+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/Order.vue

## Purpose

Single-order detail page (SFC) shared by customer and operator roles. Loads one order by route id from the orders store, gates action buttons on server-provided `actions` flags, and composes the payment, withdrawal, and shipment panels alongside a timeline. Exists as the top-level view for the `/orders/:id` route.

## Key elements

- **`OrderTargetPage`** (default-export name block) — gives the SFC a stable component name for devtools and `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`handleCancel`** — confirms via a dialog, calls `cancelOrder(id)` from the store, reports success/failure; failure blocks the cancel button in place via `useBlockingError`.
- **`handleReorder`** — calls `reorder(id)` on the cart store, diffs items with `leftOutByReorder` to report skipped products, navigates to the Cart route.
- **`withInvoice(action)`** — single shared fetch of the invoice PDF blob; passes the blob to a caller-supplied action (download vs. view). Shared `invoiceLoading` ref and `invoiceError` block both buttons.
- **`cancellable` / `invoiceAvailable`** (computed) — read `actions.cancel` / `actions.invoice` straight from the server response; deliberately **not** re-derived locally so a lifecycle change on the API cannot desync the button state.
- **`orderCurrency`** (computed) — frozen per-order currency; falls back to `shopCurrency` only while no order is loaded.
- **`timelineRefreshKey`** (computed) — pipe-joined snapshot of status fields + `updatedAt`; passed as a `:key` so `OrderTimeline` re-renders on any state change.
- **`auditLogTo`** (computed) — resolves an `AuditLog` route link, returning `undefined` (button hidden) on builds where the admin module is absent.
- **`addressLine`** — formats a frozen address object into a single readable string; used for both shipping and billing display.
- **`useBlockingError`** instances — dedicated per-action (`cancelError`, `reorderError`, `invoiceError`) so a failure blocks its own button rather than joining a shared toast.

## Relationships

- **`src/modules/orders/store.ts`** — primary data source. Pulls `currentOrder`, `loading`, `watchOrder`, `fetchOrder`, `fetchInvoice`, `fetchCreditNotes`, `fetchCreditNote`, and `cancelOrder` via `useOrdersStore()` / `storeToRefs`.
- **`src/modules/orders/components/OrderTimeline.vue`** — rendered as a child; receives `timelineRefreshKey` as a `:key` to force re-read on state change.
- **`src/modules/orders/composables/use-order-actions-refetch.ts`** — imported composable; forces a detail re-fetch when the cached order record is missing its `actions` object.
- **`src/modules/orders/domain/index.ts`** — re-exports `leftOutByReorder` (originating from `domain/reorder.ts`), used in `handleReorder` to diff order items against the cart result.
- **`src/modules/orders/tests/order-view.spec.ts`** — unit test suite that exercises this component's rendering and action handlers.

## Notes

- The named-component `<script>` block is **required** alongside `<script setup>`; removing it breaks devtools identification and `<KeepAlive>` cache matching.
- `reorderLoading` comes from the **cart** store (`useCartStore`), not the orders store. The reorder button must disable on this flag, not the orders `loading`, or a double-click fires the request twice.
- The audit-log link guard (`linkIfRouted` returning `undefined`) is intentional: `admin` is not declared in this module's `MODULE_EDGES`, so it must be treated as optional at build time. The `session.can('read','AuditLog')` check is a separate, per-visitor permission gate.
- All monetary display uses `orderCurrency`, never the live `shopCurrency`; mixing them would show prices in the wrong currency for historical orders.
