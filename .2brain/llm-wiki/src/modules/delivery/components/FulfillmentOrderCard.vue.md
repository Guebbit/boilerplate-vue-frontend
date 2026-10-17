---
source: src/modules/delivery/components/FulfillmentOrderCard.vue
sha256: b015fa3a35c6501923b609b6b46b3558cf58db2ca55dfa8a6059ccc3bd72014c
generated_at: 2026-10-17T00:45:59.781620+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/FulfillmentOrderCard.vue

## Purpose

Renders a single fulfillment order as a card in Shopify's admin layout: status chip, hold reason/note, expected and promised dates, buyer consent state, per-line shipped/cancelled quantities, the shipments cut from this order, and context-sensitive action buttons. Every action button is driven by the server-provided `actions` object on the record; the sole exception is a forced-ship button surfaced to an `override` holder when the ordinary ship action is unavailable.

## Key elements

- **Props** — `fulfillmentOrder`, `shipments`, `trackingRequired?`, `override?` (the order's `actions.override` status list).
- **Emit `moved`** — fired once after any successful store write so the parent page can re-fetch.
- **`offerShip` (computed)** — true when `actions.ship` is present, *or* when the caller holds `override` with `shipped`, the order is `physical`, status is `open`/`in_progress`, and `shippableLines` still has remaining quantity.
- **`expectedDate` / `promisedDate` (computed)** — `expectedAt ?? agreedAt`; the original promised date is shown only when `expectedAt` has drifted from `agreedAt`.
- **`consentKey` (computed)** — picks the i18n key for the buyer-consent chip (awaiting / confirmed / expired) and distinguishes buyer-facing vs. staff-facing copy via `actions.confirmWait`.
- **`run(move, success)`** — shared wrapper: clears the inline error, calls the store action, toasts success + emits `moved`, or calls `reportCardError` to block in-place.
- **`markFulfilled` / `confirmWait` / `release`** — thin wrappers around `deliveryStore.fulfill`, `.confirmWait`, `.release`, each routed through `run`.
- **`canForceShip` / `canForceDeliver` (computed)** — check whether `override` includes `shipped` / `delivered`.
- **Dialogs** — `HoldDialog` and `ShipItemsDialog` are toggled by local `ref` booleans (`holdOpen`, `shipOpen`).
- **`ShipmentRow`** — renders each entry in the `shipments` array.

## Relationships

- **`src/modules/delivery/store.ts`** — all writes (`fulfill`, `confirmWait`, `release`, ship/hold actions inside dialogs) go through `useDeliveryStore`; the `loading` flag is read via `storeToRefs` to disable every button while a request is in flight.
- **`src/modules/delivery/domain/ship-lines.ts`** — `shippableLines` is imported to determine whether any physical quantity remains, gating the forced-ship path in `offerShip`.
- **`src/modules/delivery/components/HoldDialog.vue`** — rendered when the "Hold" button (gated by `actions.hold`) is clicked.
- **`src/modules/delivery/components/ShipItemsDialog.vue`** — rendered when the "Ship" button is clicked; receives `trackingRequired` and `override` for its own logic.
- **`src/modules/delivery/components/ShipmentRow.vue`** — rendered once per shipment in the `shipments` array.
- **`src/modules/delivery/tests/fulfillment-order-card.spec.ts`** — unit/spec tests targeting this component's computed logic and button visibility.

## Notes

- **Server-driven actions:** buttons appear or disappear based entirely on `fulfillmentOrder.actions.*`. The only card-local decision is the forced-ship fallback (`canForceShip` + `kind === 'physical'` + status + `shippableLines`). The server is expected to refuse invalid transitions.
- **Race protection:** every button reads the shared `loading` ref from the delivery store, so a second click is disabled until the first request settles — no per-button local loading state.
- **Inline vs. toast errors:** dialog-less actions (fulfil, release, confirmWait) use `useBlockingError` to show an `InlineErrorAlert` in-place; dialog-based actions (ship, hold) handle their own error UX inside the dialog.
- **Consent copy:** the same `consent === 'awaiting'` state renders different text for buyer vs. staff depending on whether `actions.confirmWait` is present on the record.
- **`data-test` attributes** are present on every interactive and informational element for Playwright/Cypress E2E selectors.
