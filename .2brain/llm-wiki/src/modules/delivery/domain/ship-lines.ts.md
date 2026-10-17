---
source: src/modules/delivery/domain/ship-lines.ts
sha256: ba42dc7b9a64adb57af0990d00d3047f74886bc4a4888747a0966ab773c6de84
generated_at: 2026-10-17T00:47:55.603914+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/domain/ship-lines.ts

## Purpose

Pure validation and counting helpers for the delivery UI panels. They turn raw fulfillment-order data into (a) a form-ready verdict of what a ship dialog may send, and (b) a stable shipment count for display. The server re-validates all limits (`DELIVERY_LINES_INVALID`); these functions only prevent the UI from requesting the impossible or hand-counting parcels.

## Key elements

- **`ShipLineInput`** – Interface for a single shipment line as the API expects it (`productId`, `quantity`).
- **`ShipLinesVerdict`** – Result of validating the dialog's quantity fields: a `valid` flag plus the filtered `lines` to submit (zero-quantity rows excluded).
- **`shippableLines(lines)`** – Filters fulfillment-order lines to those with `remaining > 0`, preserving order.
- **`readShipLines(lines, typed)`** – Reads the dialog's free-text quantity map (keyed by product id) against each line's `remaining`. Returns a `ShipLinesVerdict`. A quantity is "fitting" if it is a non-negative integer ≤ `remaining`; the verdict is valid only when every row fits **and** at least one row has quantity > 0.
- **`shipmentCount(fulfillmentOrders, shipments)`** – Returns the larger of (a) shipments linked to physical fulfillment orders and (b) non-cancelled physical fulfillment orders. Excludes digital and cancelled orders. Used so the displayed count doesn't shrink as parcels leave.

## Relationships

- **`ShipItemsDialog.vue`** – Consumes `readShipLines` (and the `ShipLinesVerdict` / `ShipLineInput` types) to validate and build the payload the ship dialog submits.
- **`FulfillmentOrderCard.vue`** – Calls `shipmentCount` to render the "Arrives in N shipments" label.
- **`ShipmentPanel.vue`** – Uses `shippableLines` (and possibly `shipmentCount`) to render the shippable quantity fields and the panel's header count.
- **`ship-lines.spec.ts`** – Unit tests covering `shippableLines`, `readShipLines`, and `shipmentCount`.

## Notes

- All three exported functions are pure; they accept `readonly` arrays and never mutate their inputs.
- `readShipLines` treats a missing key in `typed` as an empty string (i.e., quantity 0), so omitting a product id is equivalent to shipping zero of it.
- `shipmentCount` deliberately takes the **max** of cut shipments vs. remaining physical orders so the number is stable across the shipping lifecycle (it never decreases as parcels leave).
- Types (`FulfillmentOrder`, `FulfillmentOrderLine`, `Shipment`) are imported from `@types`; this module holds no runtime dependency beyond those type-only imports.
