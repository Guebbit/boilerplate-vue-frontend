---
source: src/modules/delivery/components/ShipItemsDialog.vue
sha256: a3a0a7f33f436433f5b0955fef83deef1ab4902e5570598d2753ef2f69991d80
generated_at: 2026-10-17T00:46:45.557193+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipItemsDialog.vue

## Purpose

A modal dialog that lets staff cut a partial or full shipment from one fulfillment order. Staff set a quantity per remaining line, optionally enter a tracking code, and (when the ordinary ship action is closed) may force the shipment with a required reason. The dialog owns its submit call, reports success as a toast, and surfaces server refusals inline.

## Key elements

- **Props** — `fulfillmentOrder` (the order to ship from), `trackingRequired` (whether a tracking code is mandatory), `canForce` (whether the caller may override a closed ship action).
- **`isOpen` (v-model)** — Two-way boolean controlling dialog visibility.
- **`quantities`** — `Record<string, string>` of per-product quantity inputs, seeded with each line's remaining count on open.
- **`trackingCode` / `force` / `forceReason`** — Optional shipment metadata collected by the form.
- **`lines` (computed)** — Calls `shippableLines` from the domain layer to get the ordered, shippable lines for the current order.
- **`verdict` (computed)** — Calls `readShipLines` to validate the current quantity entries; exposes `.valid` and `.lines` used at submit time.
- **`offerForce` (computed)** — True only when the order's ordinary `actions.ship` is closed **and** `canForce` is set.
- **`canSubmit` (computed)** — Aggregates all guard conditions (not loading, valid verdict, tracking code if required, force reason if force is on).
- **`watch(isOpen, …)`** — Re-seeds `quantities`, clears `trackingCode`/`force`/`forceReason`, and clears any prior error each time the dialog opens.
- **`submit()`** — Calls `deliveryStore.ship(orderId, { lines, trackingCode?, forced?, reason? })`; on success shows a toast, closes the dialog, and emits `'shipped'`; on failure routes the error into the local blocking-error state for inline display.
- **`shipError` / `reportShipError` / `clearShipError`** — From the `useBlockingError` composable; keeps a 409/422/step-up refusal next to the form.
- **Emits `shipped`** — Tells the parent page to re-read the order.

## Relationships

- **`src/modules/delivery/domain/ship-lines.ts`** — Provides `shippableLines` (which lines are still shippable) and `readShipLines` (validates quantities and produces the `lines` payload sent to the store).
- **`src/modules/delivery/store.ts`** — Supplies `useDeliveryStore`, whose `ship` action performs the actual API call and whose `loading` flag disables the submit button during in-flight requests.
- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — The card that renders a fulfillment order and is the expected trigger for opening this dialog (passes the order, `trackingRequired`, and `canForce`).
- **`src/modules/delivery/tests/ship-items-dialog.spec.ts`** — Unit/integration tests for this component's form logic, submit flow, and force-shipping path.

## Notes

- The `watch` on `isOpen` (not `onMounted`) re-seeds the form so a single dialog instance can serve a list of orders without stale state.
- The form uses `novalidate` and relies entirely on the `verdict` computed for client-side validation; the server remains the authoritative check.
- Quantities are stored as **strings** (bound to `<input type="number">`) and only parsed by `readShipLines` at submit time.
- The force UI (checkbox + textarea) is hidden unless the order's ordinary ship action is explicitly closed **and** the caller opts in via `canForce`; both conditions are required.
- `InlineErrorAlert` displays the blocking error in place; the dialog does **not** auto-close on failure, so staff can correct and resubmit.
