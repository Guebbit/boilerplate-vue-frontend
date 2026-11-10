---
source: src/modules/delivery/components/FulfillmentOrderCard.vue
sha256: 78d1af1c5be04aa5c18ff0bb1598b7400e1ebfd77bb7c97cbd59bbd4400d8b82
signature: 9e22d53ba62b62be63bf725c17139341e96cea7a9e695b7a05c7f6a712ca671a
generated_at: 2026-11-10T04:14:21.383946+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/FulfillmentOrderCard.vue

## Purpose
Renders a single fulfillment order as a Vuetify card in Shopify-admin style: header with number/status/hold chips, date context (expected, promised, last notice), line-item progress, action buttons driven by the server-supplied `actions` object, and a list of shipments cut from the order. It owns the two dialog triggers (ship, hold) and the two dialog-less writes (fulfill, release), and bubbles a `moved` event so the parent page can re-fetch.

## Key elements
- **Props** — `fulfillmentOrder` (the record), `shipments` (oldest-first list of shipments), `orderAddress` (optional one-line address passed to each `ShipmentRow`).
- **Emit `moved`** — fired after any successful mutation (fulfill, release, ship, hold) so the owning page refreshes.
- **`statusLabel`** — computed chip text; maps `on_hold` without a reason to the buyer-facing "Delayed" label.
- **`hasNoDateYet` / `promisedDate`** — computed pairs that surface the original promise (`agreedAt`) once `expectedAt` has diverged or been cleared.
- **`run(move, success)`** — internal helper that clears card-level error state, awaits a store call, toasts on success, emits `moved`, or reports the error inline via `useBlockingError`.
- **`markFulfilled` / `release`** — thin wrappers over `run` for the two dialog-less store actions.
- **`offerShip`** — computed gate (`fulfillmentOrder.actions.ship`) controlling visibility of the Ship button.
- **Template sections** — header chips, hold notice/reason/message/note paragraphs, expected/promised/last-notice dates, cancel-reason chip, `<ul>` of line items, action-button row, `InlineErrorAlert`, shipments `<ul>`, and the two dialogs.
- **`data-test` attributes** — every meaningful element carries a stable `data-test` hook for the spec.

## Relationships
- **`store.ts`** — the delivery Pinia store; the card invokes its mutation actions for dialog-less writes and reads its `loading` ref (via `storeToRefs`) to disable all buttons while any delivery call is in flight.
- **`ShipmentRow.vue`** — rendered once per shipment in the card's shipments list; forwards the child's `moved` event upward.
- **`ShipItemsDialog.vue`** — opened by the Ship button; its `shipped` event is re-emitted as `moved`.
- **`HoldDialog.vue`** — opened by the Hold button; its `held` event is re-emitted as `moved`.
- **`fulfillment-order-card.spec.ts`** — the component's unit/integration test; targets the `data-test` attributes throughout the template.

## Notes
- Button visibility is **server-driven**: each button is gated by `fulfillmentOrder.actions.*`. The frontend never infers permissions from status alone.
- The `loading` ref from the store is shared across the entire delivery module; a single in-flight call disables every button in every card simultaneously.
- `useBlockingError` provides **card-local** inline error (shown in `InlineErrorAlert`), distinct from the toast used on success. Dialog-based errors (ship/hold) are handled inside those dialogs.
- The "Delayed" label logic: `on_hold` + no `holdReason` + `holdNotice !== 'awaiting_stock'` → shows the buyer-friendly term. If `holdNotice` is `awaiting_stock`, a plain paragraph is shown instead of a warning alert.
- The component is purely presentational + one thin action layer; no data fetching happens here.
