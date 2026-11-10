---
source: src/modules/delivery/components/ShipItemsDialog.vue
sha256: d82f3ae274891135cab16357185bca5efaa7bec7b67a4861d88bed4dc4839b9b
signature: 3d4c14b9f81376b83f5dd218d2aa9de88193a6df9077e6e2447c550c6cde27a9
generated_at: 2026-11-10T04:16:02.222244+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipItemsDialog.vue

## Purpose

A modal dialog that lets staff cut (partial-ship) a single fulfillment order. The user picks a quantity per shippable line (default: full remaining) and an optional tracking code, then submits. The dialog owns the store call, reports success as a toast, and surfaces refusals (409/422) inline beside the form.

## Key elements

- **`props.fulfillmentOrder`** – the `FulfillmentOrder` being shipped from; provides the lines and the `actions.ship` permission flag.
- **`isOpen` (`defineModel<boolean>`)** – two-way v-model controlling dialog visibility; the parent page toggles it.
- **`quantities` (ref)** – a `Record<string, string>` mapping product id → quantity input. Seeded with each line's `remaining` every time the dialog opens.
- **`trackingCode` (ref)** – free-text carrier code, optional (omitted from the payload if blank).
- **`lines` (computed)** – `shippableLines(props.fulfillmentOrder.lines)` filtered to lines that still have stock to ship.
- **`verdict` (computed)** – calls `readShipLines(order.lines, quantities)` to produce `{ valid, lines }`; drives the inline "invalid" message and the payload.
- **`canSubmit` (computed)** – `!loading && verdict.valid && order.actions.ship`; gates the submit button.
- **`watch(isOpen, …)`** – re-seeds `quantities` and clears `trackingCode` / `shipError` whenever the dialog transitions to open (not on mount, so one instance can serve a list).
- **`submit`** – wrapped in `singleFlight`; calls the delivery store's `ship` action. On success: toast, close dialog, emit `'shipped'`. On failure: feeds `useBlockingError` for inline display.
- **`useBlockingError`** – local error state (`message`, `report`, `clear`) rendered by `InlineErrorAlert`; keeps 409/422/step-up refusals next to the form instead of a toast.

## Relationships

- **`src/modules/delivery/store.ts`** – the dialog imports `useDeliveryStore` from this file and reads its `loading` ref (via `storeToRefs`) to disable the submit button while a delivery call is in flight. The store is the sole entry point for the ship mutation.
- **`src/modules/delivery/domain/index.ts`** – re-exports the domain helpers the dialog uses: `shippableLines` (filter to shipable lines) and `readShipLines` (validate quantities + shape the payload).
- **`src/modules/delivery/domain/ship-lines.ts`** – the concrete implementation behind `shippableLines` and `readShipLines`; the dialog's `lines` and `verdict` computeds depend on its logic.
- **`FulfillmentOrderCard.vue`** – the owning card component; it renders this dialog, supplies the `fulfillmentOrder` prop, toggles `isOpen`, and listens for the `'shipped'` event to re-fetch the order.
- **`src/modules/delivery/tests/ship-items-dialog.spec.ts`** – tests exercising this component's form seeding, validation, submit flow, and error display.

## Notes

- Quantities are held as **strings** (bound to `<input type="number">` fields); `readShipLines` in the domain layer is responsible for parsing and validation. Do not assume numeric types in `quantities`.
- The `watch` fires on every open transition, **not** on component mount. This is intentional: a single dialog instance may be reused across a list of orders.
- `singleFlight` guarantees at most one in-flight `ship` call regardless of how fast the user clicks; the `loading` ref from the store provides a secondary guard on the button.
- The server is the authority on shippable limits; the client-side `verdict` check is a UX convenience, not a security boundary.
- All user-facing strings are routed through `vue-i18n` under the `ship-items-dialog.*` namespace.
