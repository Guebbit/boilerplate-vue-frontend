---
source: src/modules/orders/views/Order.vue
sha256: 2bc2e62f8f50d5dc74441219ec98a2b3508b65ff14cdfe7ce322ef5f4f527b4a
generated_at: 2026-10-02T15:25:04.138933+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/Order.vue

## Purpose

Order detail page shared by both customer and operator roles. Loads a single order by route id, force-re-fetches the record when the cached copy is missing the server-provided `actions` object, and renders the payment, transfer-instructions, shipment, and returns panels as self-contained cross-module components. It also exposes the cancel, reorder, and invoice (download/view) actions directly in the UI.

## Key elements

- **`handleCancel`** – Opens a confirmation dialog, calls `cancelOrder(id)` from the orders store, reports success as a toast or blocks the button in place via `useBlockingError`.
- **`handleReorder`** – Calls `reorder(order.id)` on the cart store, diffs the returned cart against the original items with `leftOutByReorder`, toasts a warning naming skipped products, then navigates to the Cart route.
- **`cancellable` / `invoiceAvailable`** (computed) – Read `currentOrder.actions.cancel` / `.invoice` straight from the server payload rather than re-deriving status rules locally, so the button visibility stays in lockstep with API lifecycle rules.
- **`orderCurrency`** (computed) – Returns the order's own frozen `currency` field; falls back to `shopCurrency` only for orders that predate the field.
- **`withInvoice(action)`** – Single fetch of the invoice PDF; the caller (`downloadInvoice` or a new-tab view) receives the `Blob` and renders it its own way. Both buttons share one `invoiceLoading` flag and one `useBlockingError` state.
- **`auditLogTo`** (computed) – Resolves a route link to `AuditLog` parameterised with the order id; returns `undefined` (hiding the button) on builds where the `admin` module is not part of `MODULE_EDGES`.
- **`shippingAddressText` / `billingAddressText`** (computed) – Flatten the order's frozen address objects into a single display line via the `addressLine` helper.
- **`heroTitle` / `heroDescription` / `orderStatus`** (computed) – Feed the `ItemDetailHero` organism with the order id, notes/email, and a translated status label.
- **`reorderLoading`** – Pulled from the cart store's own `fetchAny` loading ref (distinct from the orders-store `loading`) to guard the reorder button against double-clicks.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor (likely reached indirectly through one of the toolkit or store imports). No direct import or call is visible in this file's source.

## Notes

- **Server-authoritative action gates.** `cancellable` and `invoiceAvailable` deliberately read the API's `actions` booleans instead of mirroring status-transition rules in the client. The comments flag this as a deliberate anti-drift measure: a rule that changes server-side would otherwise leave a button offering an action the API rejects.
- **Two independent loading flags for reorder.** The reorder button watches the *cart* store's `loading` ref, not the *orders* store's `loading`, because `reorder` runs under the cart's `fetchAny`. Using the wrong flag lets a double-click fire the request twice (tracked as FA39).
- **Frozen currency (FA37).** All price formatting on the page uses `orderCurrency`, never the shop-wide default. The `shopCurrency` fallback exists only for orders created before `Order.currency` was introduced.
- **Audit-log link is optional (FA86).** Because `admin` is not declared in this module's `MODULE_EDGES`, the link is resolved through `linkIfRouted` with an `undefined` fallback rather than importing the route statically. A `session.can('read','AuditLog')` check sits alongside it as a second, per-visitor gate.
- **Per-button error isolation.** Cancel, reorder, and invoice each get their own `useBlockingError` instance so a failure in one action renders an inline `InlineErrorAlert` next to that specific control instead of piling into the global toast queue.
