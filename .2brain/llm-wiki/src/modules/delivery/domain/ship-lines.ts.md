---
source: src/modules/delivery/domain/ship-lines.ts
sha256: 2eba049c4c24d141ffbe4cb01e0e044a6b8c13440e3304a5b4a42a9632a04955
signature: 50991e98a917c8e31c94a29649b0bc4d89d235d411c51f445ce98bf4c7be7e20
generated_at: 2026-11-10T04:17:52.887426+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/domain/ship-lines.ts

## Purpose

Pure, side-effect-free helpers that power the delivery UI panels: validating what the ship dialog's quantity fields represent and computing how many shipments an order will arrive in. They exist so the form rejects impossible inputs early and the page can display a shipment count without manual tallying. The server remains the final authority (`DELIVERY_LINES_INVALID`).

## Key elements

- **`ShipLineInput`** – The wire shape for one line in a shipment request: `productId` + `quantity` (≥ 1).
- **`ShipLinesVerdict`** – The result of validating the dialog: a `valid` flag plus the `lines` array ready to send.
- **`shippableLines(lines)`** – Filters `FulfillmentOrderLine[]` down to those with `remaining > 0`, preserving order.
- **`readShipLines(lines, typed)`** – Reads the dialog's per-product quantity strings against each line's remaining amount. Returns a `ShipLinesVerdict`; zero-quantity rows are dropped from `lines`, and `valid` is false if any row is non-integer, negative, exceeds `remaining`, or no row ships at least one unit.
- **`shipmentCount(fulfillmentOrders, shipments)`** – Returns the number the UI displays ("Arrives in N shipments"). Takes `Math.max` of (shipments linked to physical fulfillment orders, non-canceled physical fulfillment orders) so the count does not shrink once the first parcel leaves. Digital and canceled fulfillment orders are excluded.

## Relationships

- **`ShipItemsDialog.vue`** – Consumes `readShipLines` and the `ShipLinesVerdict` / `ShipLineInput` types to validate the user's quantity inputs before submitting a shipment.
- **`ShipmentPanel.vue`** – Consumes `shipmentCount` to render the "Arrives in N shipments" label.
- **`ship-lines.spec.ts`** – Unit tests covering the validation logic in `readShipLines` and the counting logic in `shipmentCount`.

## Notes

- `ShipLineInput.quantity` is documented as "at least 1," but `readShipLines` internally permits `quantity === 0` (it marks the row as fitting); zero-quantity rows are simply omitted from the output `lines`. The "at least 1" guarantee is enforced by requiring `picked.length > 0` for overall validity.
- In `readShipLines`, a missing key in the `typed` record is coerced via `Number('')` → `0`, which passes the `>= 0` and `<= remaining` checks but is then dropped by the `quantity > 0` filter. This means an unentered field is treated as "ship nothing of this product," not as an error.
- `shipmentCount` deliberately uses `Math.max` rather than picking one source, so the displayed count is stable across the transition from "planned" to "in-transit."
