---
source: src/modules/orders/views/OrderTarget.vue
sha256: ca41b448bc1e3cccb92e6dabe78f36eb3aabe0ad4b7036e8a2680eb8e739337a
signature: ca41b448bc1e3cccb92e6dabe78f36eb3aabe0ad4b7036e8a2680eb8e739337a
generated_at: 2026-11-10T05:06:26.521979+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrderTarget.vue

## Purpose

Order detail page shared by customer and operator roles. Loads a single order by route id, forces a detail re-fetch (because the list-seeded cache row lacks the `actions` field), and renders payment, withdrawal, and shipment panels alongside an order timeline. Provides the cancel and reorder action buttons with their own blocking-error states and server-driven availability.

## Key elements

- **`handleCancel`** — Cancels the order behind a confirmation dialog; guarded by `singleFlight` to prevent double-fires. Success is a toast; failure blocks the button in place via `useBlockingError`.
- **`handleReorder`** — Calls `useCartStore().reorder(order.id)`, inspects the server's per-line outcome via `reorderOutcome`, toasts warnings for removed/capped items, then navigates to the cart.
- **`reloadAfterReport` / `timelineRefreshKey`** — Increments a counter and force-fetches the order after a panel (delivery, payments, returns) reports a state change; the computed key is passed to `OrderTimeline` so it re-reads even when `updatedAt` did not shift.
- **`cancelable`** — Reads `currentOrder.actions.cancel` directly from the server payload rather than re-deriving status rules locally.
- **`orderCurrency`** — Falls back to `shopCurrency` only while no order is loaded; once loaded, all prices use the order's frozen currency.
- **`auditLogTo`** — Computed route link to the audit log, `undefined` (hiding the button) on builds without the `admin` module.
- **`watchOrder(() => id, …)`** — Selects and fetches the order whenever the route id changes; the forced fetch is intentional (see Notes).
- **`useOrderHero` / `useOrderDocuments`** — Delegated composables providing the hero heading/status and the invoice & credit-note actions respectively.

## Relationships

- **`src/modules/orders/store.ts`** — Primary data source: `watchOrder`, `fetchOrder`, `cancelOrder`, `currentOrder`, `loading` all come from `useOrdersStore`.
- **`src/modules/orders/components/OrderTimeline.vue`** — Rendered in the template; receives `timelineRefreshKey` to trigger re-reads on state change.
- **`src/modules/orders/composables/use-order-documents.ts`** — Supplies invoice/credit-note availability, loading, error, and download/view actions.
- **`src/modules/orders/composables/use-order-hero.ts`** — Supplies `heroTitle`, `heroDescription`, `orderStatus` for the page header.
- **`src/modules/orders/domain/index.ts`** — Provides `reorderOutcome`, which diffs the order's lines against the server's reorder response to name left-out and capped items.
- **`src/modules/orders/tests/order-view.spec.ts`** — Unit/integration tests for this view's behavior (cancel, reorder, timeline refresh, missing-record handling).

## Notes

- **Forced fetch is load-bearing.** The orders list seeds the Pinia cache with summary rows. `watchOrder` is cache-first, so without the forced detail fetch the page would render with no `actions` and every action button would be invisible. Do not "simplify" this away.
- **`cancelable` is server-authoritative.** The set of statuses that permit cancellation depends on role and API lifecycle rules. There is intentionally no local status list here.
- **Two separate loading flags.** `loading` (orders store) and `reorderLoading` (cart store) are independent; the reorder button must disable on the latter, not the former.
- **`reportCount` exists because `updatedAt` is not a reliable change signal** once a panel's mutation no longer bumps that timestamp. It is the tie-breaker in `timelineRefreshKey`.
- **`auditLogTo` is guarded, not assumed.** The `admin` module is not a declared dependency of this module; the computed simply returns `undefined` on builds where it is absent.
